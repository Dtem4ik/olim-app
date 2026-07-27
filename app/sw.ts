import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { handleNavigate, OFFLINE_URL } from "@/lib/pwa/navigation-strategy";

// The service-worker source (Phase 5c; offline chain hardened in hotfix-offline).
// @serwist/next compiles this to `public/sw.js` and injects the precache manifest
// (`__SW_MANIFEST`) with the build's static assets, app shell, and the app-shell
// routes + `/offline` document (see `additionalPrecacheEntries` in next.config.ts).
//
// Navigations are handled by our OWN route (below) with a guaranteed fallback
// chain — we no longer rely on serwist's implicit defaultCache page matcher. Two
// reasons that combination returned `no-response` on a real iPhone:
//   1. defaultCache's "pages" matcher tests `Content-Type: text/html`, a header
//      GET navigations never send (they send `Accept`), so real navigations fell
//      through to the generic "others"/NetworkOnly routes.
//   2. When the network AND the runtime cache both miss (cold or iOS-evicted
//      state), the only fallback was a single precache lookup of `/offline`; if
//      that missed, the handler resolved to nothing → Safari `no-response`.
// `handleNavigate` makes returning nothing structurally impossible.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Runtime cache for visited documents (our navigation handler owns it). */
const PAGES_CACHE = "pages";

/**
 * Our navigation route runs BEFORE `defaultCache`, so it wins every document
 * navigation; asset requests (JS/CSS/fonts/webp images) still flow through
 * `defaultCache`, so a previously-viewed guide's images stay cached (not grey
 * boxes) offline.
 */
const navigationCaching: RuntimeCaching = {
  matcher: ({ request }) => request.mode === "navigate",
  handler: async ({ request, event }) => {
    const preloadResponse = (event as FetchEvent | undefined)?.preloadResponse as
      | Promise<Response | undefined>
      | undefined;
    return handleNavigate(request, {
      preloadResponse,
      fetchNetwork: (req, signal) => fetch(req, { signal }),
      matchRuntime: async (req) => {
        const cache = await caches.open(PAGES_CACHE);
        return cache.match(req);
      },
      putRuntime: async (req, res) => {
        const cache = await caches.open(PAGES_CACHE);
        await cache.put(req, res);
      },
      matchPrecache: (url) => serwist.matchPrecache(url),
    });
  },
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Clean update flow: a new SW activates on next navigation and prunes stale
  // precaches, so no cache lives forever across deploys and the update can never
  // leave a stale SW serving a broken chain (docs/ARCHITECTURE.md → PWA). The
  // app-shell document routes are precached via `additionalPrecacheEntries`
  // (next.config.ts, list = APP_SHELL_ROUTES) — durable, so no separate runtime
  // warm-up is needed: the navigation handler falls back to `matchPrecache` and
  // finds them even on a cold, never-visited route.
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  navigationPreload: true,
  runtimeCaching: [navigationCaching, ...defaultCache],
  // Belt-and-braces: serwist also attaches `/offline` as the fallback for any
  // remaining document request that some other strategy might error on. Our
  // navigation route already covers `request.mode === "navigate"`.
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
