import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Decision D-18: cacheComponents/partialPrefetching off for the demo — all pages render dynamically
// (DB-driven stock must always be fresh). Revisit for production.
const nextConfig: NextConfig = {
  // Parallel agents run separate dev servers: NEXT_DIST_DIR=.next-ws3 pnpm next dev -p 3103
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
