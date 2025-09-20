/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp'],
  output: 'standalone',
  distDir: '.next',
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
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
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },
  // Configuración para producción
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig