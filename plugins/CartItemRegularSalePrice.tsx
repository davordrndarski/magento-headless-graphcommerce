import type { CartItemActionCardProps } from '@graphcommerce/magento-cart-items'
import { useDisplayInclTax } from '@graphcommerce/magento-cart/hooks'
import { Money } from '@graphcommerce/magento-store'
import type { PluginConfig, PluginProps } from '@graphcommerce/next-config'
import { Box } from '@mui/material'

export const config: PluginConfig = {
  type: 'component',
  module: '@graphcommerce/magento-cart-items',
}

export function CartItemActionCard(props: PluginProps<CartItemActionCardProps>) {
  const { Prev, ...rest } = props
  const { prices, product, quantity } = rest.cartItem

  const inclTaxes = useDisplayInclTax()

  const finalRowTotal = inclTaxes
    ? prices?.row_total_including_tax?.value ?? 0
    : prices?.row_total?.value ?? 0

  const regularUnitPrice = product?.price_range?.minimum_price?.regular_price?.value
  const finalUnitPrice = product?.price_range?.minimum_price?.final_price?.value

  const hasDiscount =
    regularUnitPrice != null &&
    finalUnitPrice != null &&
    regularUnitPrice > finalUnitPrice

  const originalRowTotal = regularUnitPrice ? regularUnitPrice * quantity : 0
  const currency = prices?.price?.currency

  return (
    <Prev
      {...rest}
      price={
        hasDiscount ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Box
              component='span'
              sx={{ textDecoration: 'line-through', color: 'text.disabled', fontSize: '0.85em' }}
            >
              <Money value={originalRowTotal} currency={currency} />
            </Box>
            <Money value={finalRowTotal} currency={currency} />
          </Box>
        ) : undefined
      }
    />
  )
}
