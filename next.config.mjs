/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evitar que Next/Webpack intente bundlear binarios nativos
  serverExternalPackages: [
    'snappy',
    '@mongodb-js/zstd',
    'mongodb-client-encryption',
    'kerberos',
    'gcp-metadata',
  ],
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
    const base = [
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
        // CSP básica para APIs
        {
          source: '/api/:path*',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: "default-src 'none'; frame-ancestors 'none'"
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
    if (process.env.NODE_ENV === 'production') return base
    return base
  },
  // Configuración de Webpack para optimizaciones adicionales
  webpack: (config, { isServer, webpack }) => {
    // Optimizaciones solo para cliente
    if (!isServer) {
      // Reemplazar moment.js con date-fns si se usa
      config.resolve = config.resolve || {}
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'moment': 'date-fns',
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
    // Evitar que Webpack resuelva módulos nativos (cliente y servidor)
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      snappy: false,
      '@mongodb-js/zstd': false,
      kerberos: false,
      'mongodb-client-encryption': false,
      'gcp-metadata': false,
    }

    const externals = Array.isArray(config.externals) ? config.externals : []
    config.externals = [
      ...externals,
      'snappy',
      '@mongodb-js/zstd',
      'kerberos',
      'mongodb-client-encryption',
      'gcp-metadata',
    ]

    return config
  },
}

export default nextConfig
