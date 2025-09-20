/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paquetes externos que Next.js no debe empaquetar
  serverExternalPackages: ['sharp'],

  // Salida standalone
  output: 'standalone',

  // Carpeta de compilación
  distDir: '.next',

  // Configuración de Turbopack
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'your-domain.com', // Cambia esto por tu dominio real
        pathname: '/api/uploads/**',
      },
    ],
  },

  // Reescrituras de rutas
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },

  // Configuración general
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },

  // TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },

  // Configuración experimental para permitir subir archivos grandes
  experimental: {
    serverActionsBodySizeLimit: '100mb',
  },
}

module.exports = nextConfig
