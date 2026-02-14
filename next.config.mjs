/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs"

const nativeMongoDeps = [
  "snappy",
  "@mongodb-js/zstd",
  "mongodb-client-encryption",
  "kerberos",
  "gcp-metadata",
  "@aws-sdk/credential-providers",
  "aws4",
  "socks"
]

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Optimizaciones de producción
  // swcMinify es default en Next.js 15, no necesario especificar
  compiler: {
    // Remover console.log en producción para seguridad y performance
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Mantener console.error y console.warn
    } : false,
    // Eliminar data-testid en producción
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? { properties: ['^data-testid$'] } : false,
  },
  // Optimizaciones experimentales para mejor performance
  experimental: {
    // optimizeCss requiere el paquete 'critters', comentado por ahora
    // optimizeCss: true,
    optimizePackageImports: ['@radix-ui/*', 'recharts', 'date-fns'], // Optimizar imports de paquetes pesados
  },
  // Headers de seguridad y cache
  async headers() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          headers: [
            {
              key: 'X-DNS-Prefetch-Control',
              value: 'on'
            },
            {
              key: 'X-Frame-Options',
              value: 'SAMEORIGIN'
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            {
              key: 'Referrer-Policy',
              value: 'origin-when-cross-origin'
            },
          ],
        },
        // Cache estático para assets
        {
          source: '/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ]
    }
    return []
  },
  // Configuración de Webpack para optimizaciones adicionales
  webpack: (config, { isServer, webpack }) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}

    if (isServer) {
      // Mantener dependencias nativas de Mongo fuera del bundle de webpack
      config.externals = config.externals || []
      config.externals.push(...nativeMongoDeps.map(dep => ({ [dep]: `commonjs ${dep}` })))
    } else {
      // Reemplazar moment.js con date-fns si se usa
      config.resolve.alias = {
        ...config.resolve.alias,
        'moment': 'date-fns',
      }

      // Evitar que webpack busque dependencias opcionales en el cliente
      for (const dep of nativeMongoDeps) {
        config.resolve.alias[dep] = false
      }
      
      // Ignorar locales innecesarios de moment/date-fns
      // webpack se pasa como parámetro en Next.js
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /moment$/,
        })
      )
    }
    
    return config
  },
}

const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
}

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions, {
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
})
