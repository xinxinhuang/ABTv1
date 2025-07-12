import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  // Set this to true if you're encountering TypeScript errors in the build
  typescript: {
    // Disable TypeScript checks during production builds
    ignoreBuildErrors: true,
  },
  // Improved caching behavior for faster builds
  poweredByHeader: false,
  // Additional security headers to protect your application
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Other Next.js configurations
  reactStrictMode: true,
};

export default nextConfig;

