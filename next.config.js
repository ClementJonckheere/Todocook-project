/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig = {
  // Static export for Capacitor native builds
  ...(isStaticExport && { output: 'export' }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.openfoodfacts.org',
      },
    ],
    // Static export requires unoptimized images
    ...(isStaticExport && { unoptimized: true }),
  },
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
};

module.exports = nextConfig;
