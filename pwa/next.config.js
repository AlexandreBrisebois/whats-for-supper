/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
        pathname: '/**',
      },
    ],
  },
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Proxy /backend/* → API container so the browser only ever calls the PWA's
  // own origin. Works on any device on the LAN without CORS or IP config.
  // Kiota SDK paths already include /api/, so don't add it again.
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL ?? 'http://api:9001';
    return [
      {
        source: '/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
