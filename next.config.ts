import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Covers are pre-sized WebP files in /public/covers (see scripts/build-covers.mjs, `npm run covers`),
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
  // Signed-in actions (like, visibility, remove) must not be operable from a page that frames this one.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
  async rewrites() {
    // Forward /api to coverage-backend (it has no CORS config). The target is fixed at `next build`
    // (rewrites live in the routes manifest), and a trailing slash would double the "/".
    const api = process.env.COVERAGE_API_ORIGIN?.replace(/\/$/, "");
    return api ? [{ source: "/api/:path*", destination: `${api}/api/:path*` }] : [];
  },
};

export default nextConfig;
