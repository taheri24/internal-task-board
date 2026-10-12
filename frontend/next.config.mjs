const backend = process.env.BACKEND_URL ?? 'http://localhost:4000';

/**
 * Proxy layer: the browser talks only to Next.js. /api/v1/* is forwarded to NestJS,
 * so HttpOnly cookies are first-party and the API origin is never exposed.
 * BACKEND_URL is read at build time for rewrites.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
