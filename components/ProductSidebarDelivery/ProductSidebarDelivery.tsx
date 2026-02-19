import { breakpointVal, iconOkCircle, iconCancel, IconSvg } from '@graphcommerce/next-ui'
import { Box } from '@mui/material'

type ProductSidebarDeliveryProps = {
  product?: {
    stock_status?: string | null
  }
}

export function ProductSidebarDelivery(props: ProductSidebarDeliveryProps) {
  const { product } = props
  const { stock_status } = product ?? {}

  const inStock = stock_status === 'IN_STOCK'

  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        alignItems: 'center',
        gridTemplate: `"image title"`,
        gridTemplateColumns: 'min-content auto',
        columnGap: theme.spacings.xxs,
        background: theme.lighten(theme.vars.palette.background.default, 0.2),
        padding: theme.spacings.xxs,
        ...breakpointVal(
          'borderRadius',
          theme.shape.borderRadius * 3,
          theme.shape.borderRadius * 4,
          theme.breakpoints.values,
        ),
        ...theme.applyStyles('light', {
          background: theme.darken(theme.vars.palette.background.default, 0.01),
        }),
      })}
    >
      <IconSvg src={inStock ? iconOkCircle : iconCancel} size='medium' sx={{ gridArea: 'image', color: inStock ? 'success.main' : 'error.main' }} />
      <Box
        sx={{
          typography: 'body2',
          gridArea: 'title',
          fontWeight: 600,
          color: inStock ? 'success.main' : 'error.main',
        }}
      >
        {inStock ? 'Ima na stanju' : 'Nema na stanju'}
      </Box>
    </Box>
  )
}