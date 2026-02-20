import React from 'react'
import type { PageOptions } from '@graphcommerce/framer-next-pages'
import { cacheFirst } from '@graphcommerce/graphql'
import { StoreConfigDocument } from '@graphcommerce/magento-store'
import { ProductListDocument, ProductScroller } from '@graphcommerce/magento-product'
import { breadcrumbs } from '@graphcommerce/next-config/config'
import { Container, LayoutHeader, PageMeta, revalidate, responsiveVal } from '@graphcommerce/next-ui'
import type { GetStaticProps } from '@graphcommerce/next-ui'
import { t } from '@lingui/core/macro'
import NoSsr from '@mui/material/NoSsr'
import type { LayoutNavigationProps } from '../components'
import { LayoutDocument, LayoutNavigation, productListRenderer } from '../components'
import { graphqlSharedClient, graphqlSsrClient } from '../lib/graphql/graphqlSsrClient'
import { GetCmsPageDocument } from '../graphql/CmsPage.gql'
import { GetCmsBlockDocument } from '../graphql/CmsBlock.gql'

type CmsPageType = {
  identifier?: string | null
  title?: string | null
  content?: string | null
  content_heading?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

type ContentPart =
  | { type: 'html'; html: string }
  | { type: 'slider'; blockId: string }

export type CmsPageProps = {
  cmsPage: CmsPageType | null
  productSliders?: Array<{ blockId: string; products: any[] }>
  contentParts?: ContentPart[]
}

type GetPageStaticProps = GetStaticProps<LayoutNavigationProps, CmsPageProps>

const PRODUCT_BLOCK_IDS = ['test_proizvodi', 'test_proizvodi_dva']

const containerSx = {
  my: 4,
  '& .pagebuilder-mobile-only': { display: { xs: 'block', md: 'none' } },
  '& .pagebuilder-mobile-hidden': { display: { xs: 'none', md: 'block' } },
}

function HomePage(props: CmsPageProps) {
  const { cmsPage, productSliders = [], contentParts = [] } = props

  if (!cmsPage) return <Container>Configure cmsPage home</Container>

  if (contentParts.length === 0) {
    return (
      <>
        <PageMeta
          title={cmsPage.meta_title || cmsPage.title || t`Home`}
          metaDescription={cmsPage.meta_description || undefined}
        />
        <LayoutHeader floatingMd hideMd={breadcrumbs} floatingSm />
        {cmsPage.content && (
          <NoSsr>
            <Container sx={containerSx}>
              <div dangerouslySetInnerHTML={{ __html: cmsPage.content }} />
            </Container>
          </NoSsr>
        )}
      </>
    )
  }

  return (
    <>
      <PageMeta
        title={cmsPage.meta_title || cmsPage.title || t`Home`}
        metaDescription={cmsPage.meta_description || undefined}
      />
      <LayoutHeader floatingMd hideMd={breadcrumbs} floatingSm />

      {contentParts.map((part, idx): React.ReactNode => {
        if (part.type === 'html') {
          if (!part.html) return null
          return (
            <NoSsr key={idx}>
              <Container sx={containerSx}>
                <div dangerouslySetInnerHTML={{ __html: part.html }} />
              </Container>
            </NoSsr>
          )
        }

        const slider = productSliders.find((s) => s.blockId === part.blockId)
        if (!slider || slider.products.length === 0) return null

        return (
          <NoSsr key={idx}>
            <ProductScroller
              title='Featured Products'
              items={slider.products}
              productListRenderer={productListRenderer}
              sizes={responsiveVal(200, 400)}
              itemScrollerProps={{
                sx: (theme) => ({
                  mb: theme.spacings.xxl,
                  '& .ItemScroller-scroller': { gridAutoColumns: responsiveVal(200, 400) },
                }),
              }}
            />
          </NoSsr>
        )
      })}
    </>
  )
}

HomePage.pageOptions = {
  Layout: LayoutNavigation,
} as PageOptions

export default HomePage

function parseContentParts(
  pageContent: string,
  sliders: Array<{ blockId: string; skuString: string }>,
): ContentPart[] {
  const parts: ContentPart[] = []
  let remaining = pageContent

  for (const slider of sliders) {
    const idx = remaining.indexOf(slider.skuString)
    if (idx === -1) continue

    const before = remaining.slice(0, idx)
    if (before) parts.push({ type: 'html', html: before })
    parts.push({ type: 'slider', blockId: slider.blockId })
    remaining = remaining.slice(idx + slider.skuString.length)
  }

  if (remaining) parts.push({ type: 'html', html: remaining })

  return parts
}

export const getStaticProps: GetPageStaticProps = async (context) => {
  const client = graphqlSharedClient(context)
  const conf = client.query({ query: StoreConfigDocument })
  const staticClient = graphqlSsrClient(context)

  const confData = (await conf).data
  const url = confData?.storeConfig?.cms_home_page ?? 'home'

  const cmsPageQuery = staticClient.query({
    query: GetCmsPageDocument,
    variables: { identifier: url },
  })
  const layout = staticClient.query({ query: LayoutDocument, fetchPolicy: cacheFirst(staticClient) })

  const productBlocksQuery = staticClient.query({
    query: GetCmsBlockDocument,
    variables: { identifiers: PRODUCT_BLOCK_IDS },
  })

  const cmsPageData = (await cmsPageQuery).data
  const cmsPage = cmsPageData?.cmsPage || null
  const productBlocksData = (await productBlocksQuery).data
  const blocks = (productBlocksData?.cmsBlocks?.items || []).filter(Boolean)

  const productSliders: Array<{ blockId: string; products: any[] }> = []
  const sliderMeta: Array<{ blockId: string; skuString: string }> = []

  for (const blockId of PRODUCT_BLOCK_IDS) {
    const block = blocks.find((b: any) => b.identifier === blockId)
    if (!block) continue

    try {
      const cleanContent = (block.content ?? '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim()

      const productSkus = cleanContent
        .split(',')
        .map((sku: string) => sku.trim())
        .filter((sku: string) => sku.length > 0 && /^[A-Za-z0-9_-]+$/.test(sku))

      if (productSkus.length === 0) continue

      const productsQuery = staticClient.query({
        query: ProductListDocument,
        variables: {
          pageSize: 20,
          currentPage: 1,
          filters: { sku: { in: productSkus } },
        },
      })

      const { data: productsData } = await productsQuery

      if (productsData?.products?.items && Array.isArray(productsData.products.items)) {
        const sorted = [...productsData.products.items].sort((a: any, b: any) => {
          return productSkus.indexOf(a.sku) - productSkus.indexOf(b.sku)
        })

        productSliders.push({ blockId, products: sorted })
        sliderMeta.push({ blockId, skuString: productSkus.join(',') })
      }
    } catch {
      continue
    }
  }

  const contentParts: ContentPart[] =
    cmsPage?.content && sliderMeta.length > 0
      ? parseContentParts(cmsPage.content, sliderMeta)
      : []

  return {
    props: {
      cmsPage,
      productSliders,
      contentParts,
      ...(await layout).data,
      apolloState: await conf.then(() => client.cache.extract()),
    },
    revalidate: revalidate(),
  }
}
