import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Covers are pre-sized WebP files in /public/covers (see scripts/build-data.mjs),
  // so the runtime image optimizer is not needed.
  images: { unoptimized: true },
  // Playwright runs its own dev server in .next-e2e so it never collides with `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR,
  // Browser-automation output (Playwright MCP) lands in .playwright-mcp; its console log grows on every
  // Fast Refresh message, which would otherwise retrigger the watcher in a loop.
  webpack(config) {
    config.watchOptions = { ...config.watchOptions, ignored: ["**/.git/**", "**/.next*/**", "**/node_modules/**", "**/.playwright-mcp/**"] };
    return config;
  },
  async rewrites() {
    // Forward /api to coverage-backend in development (the backend has no CORS config).
    const api = process.env.COVERAGE_API_ORIGIN;
    return api ? [{ source: "/api/:path*", destination: `${api}/api/:path*` }] : [];
  },
};

export default nextConfig;
