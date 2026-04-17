/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  output: 'standalone',
  images: {
    remotePatterns: [],
  },
  typedRoutes: true,
  experimental: {
    allowedDevOrigins: ['127.0.0.1', 'localhost'],
  },

  // Proxy /backend/* → API container so the browser only ever calls the PWA's
  // own origin. Works on any device on the LAN without CORS or IP config.
  // Override API_INTERNAL_URL for local dev outside Docker (e.g. http://localhost:5001).
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL ?? 'http://api:5000';
    return [
      {
        source: '/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
