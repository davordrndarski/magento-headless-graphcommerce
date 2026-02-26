const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '../patches/PickupLocationForm.tsx')
const dest = path.join(__dirname, '../node_modules/@graphcommerce/magento-cart-pickup/components/PickupLocationForm.tsx')

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest)
  console.log('Applied pickup patch')
}
