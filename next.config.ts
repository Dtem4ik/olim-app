import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { APP_SHELL_ROUTES } from "./lib/pwa/navigation-strategy";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// PWA (Phase 5c; offline hardened in hotfix-offline): compiles app/sw.ts →
// public/sw.js and injects the precache manifest (app shell + static assets).
// Disabled in dev so HMR isn't fought by a caching SW. The `/offline` fallback
// AND the app-shell document routes are prerendered, so they are added explicitly
// with a per-build revision — this is what makes `/plan` (and the other core
// screens) open offline on a *cold* device, not only after a prior online visit.
// The revision re-caches them on every deploy so content stays fresh. `@serwist/
// next` is a webpack plugin — the production `build` script runs `next build
// --webpack` accordingly; dev stays on Turbopack.
const precacheRevision = Date.now().toString(36);
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    { url: "/offline", revision: precacheRevision },
    ...APP_SHELL_ROUTES.map((url) => ({ url, revision: precacheRevision })),
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes is deferred until real routes exist (Phase 4+); enabling it now
  // would reject the placeholder links used across the foundation.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default withSerwist(withNextIntl(nextConfig));
