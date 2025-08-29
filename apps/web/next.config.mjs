/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure output for better deployment support
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

export default nextConfig;
