/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    // NEXT_PUBLIC_DEV_MODE: process.env.DEV_MODE,
  },
  api: {
    bodyParser: true,
  },
};

module.exports = nextConfig;