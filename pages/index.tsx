import React, { useEffect, useState } from 'react'
import type { PageOptions } from '@graphcommerce/framer-next-pages'
import { cacheFirst } from '@graphcommerce/graphql'
import { StoreConfigDocument } from '@graphcommerce/magento-store'
import { ProductListDocument, ProductScroller } from '@graphcommerce/magento-product'
import { breadcrumbs } from '@graphcommerce/next-config/config'
import { Container, LayoutHeader, PageMeta, revalidate, responsiveVal } from '@graphcommerce/next-ui'
import type { GetStaticProps } from '@graphcommerce/next-ui'
import { t } from '@lingui/core/macro'
import type { LayoutNavigationProps } from '../components'
import { LayoutDocument, LayoutNavigation, productListRenderer } from '../components'
import { graphqlSharedClient, graphqlSsrClient } from '../lib/graphql/graphqlSsrClient'
import { GetCmsPageDocument } from '../graphql/CmsPage.gql'
import { GetCmsBlockDocument } from '../graphql/CmsBlock.gql'
import { ProductListDocument as PLDoc } from '@graphcommerce/magento-product'

type CmsPageType = {
  identifier?: string | null
  title?: string | null
  content?: string | null
  content_heading?: string | null
  meta_title?: string | null
  meta_description?: string | null
}

export type CmsPageProps = {
  cmsPage: CmsPageType | null
  blocks: Record<string, string>
  sliders: Record<string, any[]>
}

type GetPageStaticProps = GetStaticProps<LayoutNavigationProps, CmsPageProps>

// Definisi redoslijed blokova na pocetnoj stranici
// Klijent mijenja SKU-ove u Magento adminu u blokovima
// Developer mijenja redoslijed ovdje ako treba
const PAGE_STRUCTURE = [
  { type: 'block', id: 'test_blok_dva' },
  { type: 'slider', id: 'test_proizvodi' },
  { type: 'block', id: 'baneri_kategorije' },
  { type: 'slider', id: 'test_proizvodi_dva' },
  { type: 'block', id: 'test_blok' },
] as const

const ALL_BLOCK_IDS = PAGE_STRUCTURE.map((p) => p.id)
const SLIDER_IDS = PAGE_STRUCTURE.filter((p) => p.type === 'slider').map((p) => p.id)

// Slider komponenta - renderuje se samo na klijentu nakon mount-a
// Potpuno odvojena od CMS HTML-a, nema hydration problema
function HomepageSlider({ products }: { products: any[] }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || products.length === 0) return <div />

  return (
    <ProductScroller
      title='Featured Products'
      items={products}
      productListRenderer={productListRenderer}
      sizes={responsiveVal(200, 400)}
      itemScrollerProps={{
        sx: (theme) => ({
          mb: theme.spacings.xxl,
          '& .ItemScroller-scroller': { gridAutoColumns: responsiveVal(200, 400) },
        }),
      }}
    />
  )
}

function HomePage(props: CmsPageProps) {
  const { cmsPage, blocks = {}, sliders = {} } = props

  if (!cmsPage) return <Container>Configure cmsPage home</Container>

  return (
    <>
      <PageMeta
        title={cmsPage.meta_title || cmsPage.title || t`Home`}
        metaDescription={cmsPage.meta_description || undefined}
      />
      <LayoutHeader floatingMd hideMd={breadcrumbs} floatingSm />

      {PAGE_STRUCTURE.map((item) => {
        if (item.type === 'block') {
          const html = blocks[item.id]
          if (!html) return null
          return (
            <div
              key={item.id}
              dangerouslySetInnerHTML={{ __html: html }}
              suppressHydrationWarning
            />
          )
        }

        if (item.type === 'slider') {
          const products = sliders[item.id] ?? []
          return <HomepageSlider key={item.id} products={products} />
        }

        return null
      })}
    </>
  )
}

HomePage.pageOptions = {
  Layout: LayoutNavigation,
} as PageOptions

export default HomePage

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
  const blocksQuery = staticClient.query({
    query: GetCmsBlockDocument,
    variables: { identifiers: ALL_BLOCK_IDS },
  })

  const cmsPageData = (await cmsPageQuery).data
  const cmsPage = cmsPageData?.cmsPage || null
  const blocksData = (await blocksQuery).data
  const blockItems = (blocksData?.cmsBlocks?.items || []).filter(Boolean)

  // Parsiraj HTML blokove
  const blocks: Record<string, string> = {}
for (const block of blockItems) {
    if ((block as any).identifier && (block as any).content) {
      blocks[(block as any).identifier] = (block as any).content
    }
  }

  // Parsiraj SKU-ove iz slider blokova i fetchuj proizvode
  const sliders: Record<string, any[]> = {}
  for (const sliderId of SLIDER_IDS) {
    const block = blockItems.find((b: any) => b.identifier === sliderId)
    if (!block?.content) continue

    const cleanContent = (block.content ?? '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()

    const productSkus = cleanContent
      .split(',')
      .map((sku: string) => sku.trim())
      .filter((sku: string) => sku.length > 0 && /^[A-Za-z0-9_-]+$/.test(sku))

    if (productSkus.length === 0) continue

    try {
      const { data: productsData } = await staticClient.query({
        query: ProductListDocument,
        variables: {
          pageSize: 20,
          currentPage: 1,
          filters: { sku: { in: productSkus } },
        },
      })

      if (productsData?.products?.items && Array.isArray(productsData.products.items)) {
        const sorted = [...productsData.products.items].sort((a: any, b: any) =>
          productSkus.indexOf(a.sku) - productSkus.indexOf(b.sku)
        )
        sliders[sliderId] = sorted
      }
    } catch {
      continue
    }
  }

  return {
    props: {
      ...(await layout).data,
      apolloState: await conf.then(() => client.cache.extract()),
      cmsPage,
      blocks,
      sliders,
    },
    revalidate: revalidate(),
  }
}
