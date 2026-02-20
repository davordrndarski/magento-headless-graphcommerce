import type { PageOptions } from '@graphcommerce/framer-next-pages'
import { cacheFirst } from '@graphcommerce/graphql'
import { StoreConfigDocument } from '@graphcommerce/magento-store'
import { ProductListDocument } from '@graphcommerce/magento-product'
import { breadcrumbs } from '@graphcommerce/next-config/config'
import { Container, LayoutHeader, PageMeta, revalidate } from '@graphcommerce/next-ui'
import type { GetStaticProps } from '@graphcommerce/next-ui'
import { t } from '@lingui/core/macro'
import { Typography, Box } from '@mui/material'
import { useEffect, useState } from 'react'
import Slider from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import type { LayoutNavigationProps } from '../components'
import { LayoutDocument, LayoutNavigation, productListRenderer, ProductListItems } from '../components'
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

export type CmsPageProps = { 
  cmsPage: CmsPageType | null
  productSliders?: Array<{blockId: string, products: any[]}>
}

type GetPageStaticProps = GetStaticProps<LayoutNavigationProps, CmsPageProps>

const PRODUCT_BLOCK_IDS = ['test_proizvodi', 'test_proizvodi_dva']

function HomePage(props: CmsPageProps) {
  const { cmsPage, productSliders = [] } = props
  const [contentParts, setContentParts] = useState<string[]>([])
  const [sliderIndices, setSliderIndices] = useState<number[]>([])

  useEffect(() => {
    if (!cmsPage?.content || productSliders.length === 0) return

    let content = cmsPage.content
    const parts: string[] = []
    const indices: number[] = []

    productSliders.forEach((slider, idx) => {
      const skuList = slider.products.map(p => p.sku).join(',')
      const splitResult = content.split(skuList)
      
      if (splitResult.length > 1) {
        parts.push(splitResult[0])
        indices.push(idx)
        content = splitResult.slice(1).join(skuList)
      }
    })

    if (content) {
      parts.push(content)
    }

    setContentParts(parts)
    setSliderIndices(indices)
  }, [cmsPage?.content, productSliders])

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
    swipe: true,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 640, settings: { slidesToShow: 1 } }
    ]
  }

  if (!cmsPage) return <Container>Configure cmsPage home</Container>

  if (contentParts.length === 0 && cmsPage?.content) {
    return (
      <>
        <PageMeta
          title={cmsPage.meta_title || cmsPage.title || t`Home`}
          metaDescription={cmsPage.meta_description || undefined}
        />
        
        <LayoutHeader floatingMd hideMd={breadcrumbs} floatingSm />

        <Container 
          sx={{ 
            my: 4,
            '& .pagebuilder-mobile-only': {
              display: { xs: 'block', md: 'none' }
            },
            '& .pagebuilder-mobile-hidden': {
              display: { xs: 'none', md: 'block' }
            }
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: cmsPage.content }} />
        </Container>
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

      {contentParts.map((part, idx) => (
        <div key={idx}>
          {part && (
            <Container 
              sx={{ 
                my: 4,
                '& .pagebuilder-mobile-only': {
                  display: { xs: 'block', md: 'none' }
                },
                '& .pagebuilder-mobile-hidden': {
                  display: { xs: 'none', md: 'block' }
                }
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: part }} />
            </Container>
          )}

          {sliderIndices[idx] !== undefined && productSliders[sliderIndices[idx]]?.products?.length > 0 && (
            <Container sx={{ my: 6 }}>
              <Typography variant="h3" component="h2" sx={{ mb: 4, textAlign: 'center' }}>
                Featured Products
              </Typography>
              
              <Box sx={{ 
                '& .slick-slide > div': { 
                  px: 1,
                  outline: 'none'
                },
                '& .slick-dots': { bottom: -40 },
                '& .slick-arrow:before': { color: 'primary.main', fontSize: 40 }
              }}>
                <Slider {...sliderSettings}>
                  {productSliders[sliderIndices[idx]].products.map((product: any) => (
                    <div key={product.uid}>
                      <ProductListItems
                        items={[product]}
                        loadingEager={1}
                        title=""
                      />
                    </div>
                  ))}
                </Slider>
              </Box>
            </Container>
          )}
        </div>
      ))}
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
    variables: { identifier: url } 
  })
  const layout = staticClient.query({ query: LayoutDocument, fetchPolicy: cacheFirst(staticClient) })
  
  const productBlocksQuery = staticClient.query({
    query: GetCmsBlockDocument,
    variables: { identifiers: PRODUCT_BLOCK_IDS }
  })

  const cmsPageData = (await cmsPageQuery).data
  const cmsPage = cmsPageData?.cmsPage || null
  const productBlocksData = (await productBlocksQuery).data
  const blocks = (productBlocksData?.cmsBlocks?.items || []).filter(Boolean)

  const productSliders: Array<{blockId: string, products: any[]}> = []

  for (const blockId of PRODUCT_BLOCK_IDS) {
    const block = blocks.find((b: any) => b.identifier === blockId)
    
    if (!block) continue

    try {
      let cleanContent = (block.content ?? '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
      
      const productSkus = cleanContent
        .split(',')
        .map(sku => sku.trim())
        .filter(sku => sku.length > 0 && /^[A-Za-z0-9_-]+$/.test(sku))

      if (productSkus.length === 0) continue

      const productsQuery = staticClient.query({
        query: ProductListDocument,
        variables: {
          pageSize: 20,
          currentPage: 1,
          filters: { 
            sku: { in: productSkus } 
          }
        }
      })

      const queryResult = await productsQuery
      const productsData = queryResult.data

      if (productsData?.products?.items && Array.isArray(productsData.products.items)) {
        productsData.products.items.sort((a: any, b: any) => {
          const indexA = productSkus.indexOf(a.sku)
          const indexB = productSkus.indexOf(b.sku)
          return indexA - indexB
        })

        productSliders.push({
          blockId,
          products: productsData.products.items
        })
      }
    } catch (error) {
      continue
    }
  }

  return {
    props: {
      cmsPage,
      productSliders,
      ...(await layout).data,
      apolloState: await conf.then(() => client.cache.extract()),
    },
    revalidate: revalidate(),
  }
}