import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Covers are pre-sized WebP files in /public/covers (see scripts/build-data.mjs),
  // so the runtime image optimizer is not needed.
  images: { unoptimized: true },
  async rewrites() {
    // Forward /api to coverage-backend in development (the backend has no CORS config).
    const api = process.env.COVERAGE_API_ORIGIN;
    return api ? [{ source: "/api/:path*", destination: `${api}/api/:path*` }] : [];
  },
};

export default nextConfig;
