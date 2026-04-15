import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/register',
        permanent: false,
      },
      {
        source: '/admin',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/superadmin',
        destination: '/admin/super',
        permanent: false,
      },
      {
        source: '/inout',
        destination: '/security',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
