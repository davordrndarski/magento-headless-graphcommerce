import '../styles/custom.css'
import { FramerNextPages } from '@graphcommerce/framer-next-pages'
import { GraphQLProvider } from '@graphcommerce/graphql'
import { GlobalHead } from '@graphcommerce/magento-store'
import { CssAndFramerMotionProvider, PageLoadIndicator } from '@graphcommerce/next-ui'
import { CssBaseline, ThemeProvider } from '@mui/material'
import type { AppProps } from 'next/app'
import { theme } from '../components/theme'
import { I18nProvider } from '../lib/i18n/I18nProvider'

// Intercept all fetch requests - add token and fix street address
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    let [url, options = {}] = args
    
    // Only modify requests to /api/graphql
    if (typeof url === 'string' && url.includes('/api/graphql')) {
      try {
        // 1. Add customer token
        const apolloCache = localStorage.getItem('apollo-cache-persist')
        if (apolloCache) {
          const cache = JSON.parse(apolloCache)
          const customerTokenObj = cache['CustomerToken:{}']
          
          if (customerTokenObj?.token && customerTokenObj?.valid) {
            options.headers = {
              ...options.headers,
              authorization: `Bearer ${customerTokenObj.token}`,
            }
          }
        }

        // 2. Fix street address - remove empty addition field
        if (options.body && typeof options.body === 'string') {
          let body = JSON.parse(options.body)
          
          // Check if this is SetShippingBillingAddress mutation
          if (body.operationName === 'SetShippingBillingAddress') {
            const vars = body.variables
            
            // Build street array manually, filtering empty strings
            const streetArray = [vars.street, vars.houseNumber, vars.addition]
              .filter(line => line && line.trim() !== '')
            
            // If we filtered addition, we need to modify the query
            if (streetArray.length === 2) {
              // Remove $addition from variable declaration
              body.query = body.query
                .replace('$addition: String\n', '')
                .replace('$addition: String,', '')
              
              // Replace street array to only use 2 elements
              body.query = body.query
                .replace(/street: \[\$street, \$houseNumber, \$addition\]/g, 
                         'street: [$street, $houseNumber]')
              
              // Remove addition from variables
              delete body.variables.addition
              
              console.log('✅ Fixed street address: removed empty addition')
            }
          }
          
          options.body = JSON.stringify(body)
        }
      } catch (error) {
        console.error('❌ Fetch interceptor error:', error)
      }
    }
    
    return originalFetch(url, options)
  }
}

export default function ThemedApp(props: AppProps) {
  const { router } = props
  const { locale = 'en' } = router

  return (
    <CssAndFramerMotionProvider {...props}>
      <I18nProvider key={locale} locale={locale}>
        <GraphQLProvider {...props}>
          <ThemeProvider theme={theme}>
            <GlobalHead />
            <CssBaseline />
            <PageLoadIndicator />
            <FramerNextPages {...props} />
          </ThemeProvider>
        </GraphQLProvider>
      </I18nProvider>
    </CssAndFramerMotionProvider>
  )
}