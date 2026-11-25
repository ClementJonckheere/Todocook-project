/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.openfoodfacts.org',
      },
    ],
  },
  // Le driver Postgres reste un module Node chargé tel quel (non empaqueté)
  serverExternalPackages: ['pg'],
};

module.exports = nextConfig;
