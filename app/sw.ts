import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// The service-worker source (Phase 5c). @serwist/next compiles this to
// `public/sw.js` and injects the precache manifest (`__SW_MANIFEST`) with the
// build's static assets + app shell. `defaultCache` adds runtime caching:
// a NetworkFirst "pages" strategy caches visited HTML (so previously opened
// guides and "Мой план" open offline), fonts CacheFirst, /api NetworkFirst.
// Everything else offline falls back to /offline.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Clean update flow: a new SW activates on next navigation and prunes stale
  // precaches, so no cache lives forever across deploys (documented in
  // docs/ARCHITECTURE.md → PWA).
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
