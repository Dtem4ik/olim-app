import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// PWA (Phase 5c): compiles app/sw.ts → public/sw.js and injects the precache
// manifest (app shell + static assets). Disabled in dev so HMR isn't fought by a
// caching SW. The offline fallback page is a prerendered route, so it is added
// explicitly with a per-build revision (the app-shell assets already re-cache on
// every deploy via their content hashes). `@serwist/next` is a webpack plugin —
// the production `build` script runs `next build --webpack` accordingly; dev
// stays on Turbopack.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/offline", revision: Date.now().toString(36) }],
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
