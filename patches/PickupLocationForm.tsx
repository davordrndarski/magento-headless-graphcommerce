import type { ActionCardItemBase, UseFormComposeOptions } from '@graphcommerce/ecommerce-ui'
import {
  ActionCardListForm,
  ApolloErrorAlert,
  useFormCompose,
  useWatch,
} from '@graphcommerce/ecommerce-ui'
import { useQuery } from '@graphcommerce/graphql'
import type { ProductInfoInput } from '@graphcommerce/graphql-mesh'
import { useCartQuery, useFormGqlMutationCart } from '@graphcommerce/magento-cart'
import {
  GetShippingMethodsDocument,
  useShippingMethod,
} from '@graphcommerce/magento-cart-shipping-method'
import { useMemo } from 'react'
import { GetPickupLocationsForProductsDocument } from '../../../../graphql/GetPickupLocationsForProducts.gql'
import type {
  SetPickupLocationOnCartMutation,
  SetPickupLocationOnCartMutationVariables,
} from '../graphql/SetPickupLocationOnCart.gql'
import { SetPickupLocationOnCartDocument } from '../graphql/SetPickupLocationOnCart.gql'
import type { Location } from './PickupLocationActionCard'
import { PickupLocationActionCard } from './PickupLocationActionCard'

export type PickupLocationFormProps = Pick<UseFormComposeOptions, 'step'>

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

export function PickupLocationForm(props: PickupLocationFormProps) {
  const { step } = props
  const currentShippingMethod = useShippingMethod()

  const availableMethods = useCartQuery(GetShippingMethodsDocument, { fetchPolicy: 'cache-only' })
  const productInput = (availableMethods.data?.cart?.items ?? [])?.map<ProductInfoInput>((i) =>
    i?.__typename === 'ConfigurableCartItem'
      ? { sku: i.configured_variant.sku ?? '' }
      : { sku: i?.product.sku ?? '' },
  )
  const shippingAddress = availableMethods.data?.cart?.shipping_addresses?.[0]

  const isAvailable = currentShippingMethod === 'instore-pickup' && productInput.length > 0

  const form = useFormGqlMutationCart<
    SetPickupLocationOnCartMutation,
    SetPickupLocationOnCartMutationVariables
  >(SetPickupLocationOnCartDocument, {
    mode: 'onChange',
    defaultValues: {
      pickupLocationCode: shippingAddress?.pickup_location_code ?? undefined,
    },
    onBeforeSubmit: ({ cartId, pickupLocationCode }) => ({
      cartId,
      pickupLocationCode,
      pickupLocationAddress: {
        firstname: shippingAddress?.firstname ?? '',
        lastname: shippingAddress?.lastname ?? '',
        city: '_',
        country_code: shippingAddress?.country.code ?? '',
        street: ['_'],
        telephone: shippingAddress?.telephone ?? '_',
        postcode: '_',
      },
    }),
  })

  const { control, handleSubmit } = form
  const submit = handleSubmit(() => {})

  useFormCompose({ form, step, submit, key: 'PickupLocationForm' })

  const locationsQuery = useQuery(GetPickupLocationsForProductsDocument, {
    variables: {
      productInput,
    },
    skip: !availableMethods.data,
  })

  const locationData = locationsQuery.data ?? locationsQuery.previousData
  const locations = useMemo(
    () => (locationData?.pickupLocations?.items ?? []).filter(nonNullable),
    [locationData?.pickupLocations?.items],
  )

  if (!isAvailable) return null

  return (
    <form onSubmit={submit} noValidate>
      <ActionCardListForm<Location & ActionCardItemBase, SetPickupLocationOnCartMutationVariables>
        control={control}
        name='pickupLocationCode'
        errorMessage='Please select a pickup location'
        required
        collapse
        size='large'
        color='secondary'
        items={locations.map((location) => ({
          ...location,
          value: String(location?.pickup_location_code),
        }))}
        render={PickupLocationActionCard}
      />
      <ApolloErrorAlert error={availableMethods.error} />
    </form>
  )
}
