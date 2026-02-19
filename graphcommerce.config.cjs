const config = {
  magentoEndpoint: 'https://www.headless.fullo.io/graphql',
  magentoVersion: 247,
  canonicalBaseUrl: 'http://localhost:3000',
  mediaUrl: 'https://www.headless.fullo.io/media',

  productFiltersPro: true,
  productFiltersLayout: 'SIDEBAR',
  productListPaginationVariant: 'EXTENDED',
  storefront: [
    {
      locale: 'en',
      magentoStoreCode: 'default',
      defaultLocale: true,
    },
  ],
}

module.exports = config