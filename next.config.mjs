/** @type {import('next').NextConfig} */
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
    // Optimizaciones solo para cliente
    if (!isServer) {
      // Reemplazar moment.js con date-fns si se usa
      config.resolve.alias = {
        ...config.resolve.alias,
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
    
    return config
  },
}

export default nextConfig
