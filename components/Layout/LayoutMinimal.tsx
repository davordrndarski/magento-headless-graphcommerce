import type { LayoutDefaultProps } from '@graphcommerce/next-ui'
import { LayoutDefault } from '@graphcommerce/next-ui'
import { Footer } from './Footer'
import type { LayoutQuery } from './Layout.gql'
import { Logo } from './Logo'

function decodeHtml(html: string) {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

export type LayoutMinimalProps = LayoutQuery &
  Omit<LayoutDefaultProps, 'header' | 'footer' | 'cartFab' | 'noSticky'>

export function LayoutMinimal(props: LayoutMinimalProps) {
  const { menu, children, cmsBlocks, ...uiProps } = props

  const footerBlock = cmsBlocks?.items?.find((item) => item?.identifier === 'footer_links_block')

  return (
    <LayoutDefault
      {...uiProps}
      header={<Logo />}
      footer={
        <Footer
          socialLinks={
            footerBlock?.content ? (
              <div
                className="footer-links"
                dangerouslySetInnerHTML={{
                  __html: decodeHtml(footerBlock.content),
                }}
              />
            ) : (
              <div />
            )
          }
        />
      }
      sx={(theme) => ({ background: theme.vars.palette.background.paper })}
    >
      {children}
    </LayoutDefault>
  )
}