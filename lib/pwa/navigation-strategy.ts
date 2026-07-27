/**
 * Offline navigation strategy (hotfix-offline). The single guarantee here is the
 * whole point of the fix: a document navigation the service worker handles MUST
 * resolve to a `Response` — never `undefined`, never a thrown `no-response`. A
 * real iPhone (airplane mode) proved the old implicit serwist chain could return
 * nothing, and Safari surfaced it as
 * `FetchEvent.respondWith received an error: no-response`.
 *
 * The logic is dependency-injected and kept free of `self`/`caches`/`fetch`
 * globals so it is unit-testable in jsdom: `lib/pwa/navigation-strategy.test.ts`
 * asserts every branch — including a cold, cache-evicted device — still yields a
 * Response. The service-worker wiring lives in `app/sw.ts`.
 */

/**
 * App-shell document routes we precache so the core screens open offline even on
 * a *cold* start — before the user has visited them, and after iOS evicts the
 * runtime page cache (~7 days of non-use). These screens hydrate their live state
 * from localStorage (`olim.profile.*` / `olim.progress.*`), so a precached HTML
 * snapshot + localStorage renders the real plan with no network at all. Kept in
 * sync with `additionalPrecacheEntries` in `next.config.ts`.
 */
export const APP_SHELL_ROUTES = [
  "/",
  "/plan",
  "/guides",
  "/search",
  "/profile",
  "/onboarding",
] as const;

/** The precached branded fallback route (see `app/offline/page.tsx`). */
export const OFFLINE_URL = "/offline";

/**
 * How long to wait for the network on a navigation before falling back to cache.
 * Offline reads must never *hang* on a dead network — a flaky "lie-fi" connection
 * that neither succeeds nor fails fast would otherwise stall the whole screen.
 */
export const NAVIGATION_NETWORK_TIMEOUT_MS = 3000;

/**
 * Last-resort inline document. Used only when even the precache is gone (iOS
 * evicted every cache) so the chain still returns a real Response instead of the
 * browser error. Intentionally self-contained (no CSS/JS/font requests) and
 * localized-neutral — the branded `/offline` page is the normal fallback; this is
 * the floor beneath it. RU copy mirrors `messages/*.json → offline`.
 */
export const LAST_RESORT_OFFLINE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Нет соединения</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center;
    font-family: system-ui, -apple-system, sans-serif; text-align: center;
    padding: 1.5rem; background: #fdfcf9; color: #131620; }
  @media (prefers-color-scheme: dark) { body { background: #131620; color: #fdfcf9; } }
  main { max-width: 28rem; display: grid; gap: 0.75rem; }
  h1 { font-size: 1.75rem; margin: 0; }
  p { margin: 0; opacity: 0.7; }
  button { margin-top: 0.5rem; min-height: 44px; padding: 0 1.5rem; border: 0;
    border-radius: 1rem; font: inherit; font-weight: 600; cursor: pointer;
    background: #131620; color: #fdfcf9; }
  @media (prefers-color-scheme: dark) { button { background: #fdfcf9; color: #131620; } }
</style>
</head>
<body>
  <main>
    <h1>Нет соединения</h1>
    <p>Твой план и открытые ранее гиды доступны без сети.</p>
    <button type="button" onclick="location.reload()">Обновить</button>
  </main>
</body>
</html>`;

/** A guaranteed, never-`undefined` last-resort response built from inline HTML. */
export function lastResortOfflineResponse(): Response {
  return new Response(LAST_RESORT_OFFLINE_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Never let this synthetic page get stored as if it were the real route.
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Injected side-effecting pieces, so the ordering/guarantee logic stays pure.
 * Every method is allowed to reject/throw or resolve `undefined`; the strategy
 * treats all of those as "this link in the chain didn't produce a page" and
 * moves on.
 */
export interface NavigationStrategyDeps {
  /** The browser's navigation-preload response, if the platform provides one. */
  preloadResponse?: Promise<Response | undefined> | undefined;
  /** Network fetch for the navigation request (given an abort signal). */
  fetchNetwork: (request: Request, signal: AbortSignal) => Promise<Response>;
  /** Look this exact document up in the runtime "pages" cache. */
  matchRuntime: (request: Request) => Promise<Response | undefined>;
  /** Store a successful document in the runtime "pages" cache (best-effort). */
  putRuntime: (request: Request, response: Response) => Promise<void>;
  /** Look a URL up in the precache (app-shell routes + `/offline`). */
  matchPrecache: (url: string) => Promise<Response | undefined>;
  /** Milliseconds before abandoning the network attempt. */
  networkTimeoutMs?: number;
}

/** True for a real HTTP response we can hand back to the browser as the page. */
function isUsableResponse(response: Response | undefined): response is Response {
  return response !== void 0 && response.type !== "error";
}

async function fromNetwork(
  request: Request,
  deps: NavigationStrategyDeps,
): Promise<Response | undefined> {
  // Prefer the platform's navigation preload when present (not on iOS Safari).
  if (deps.preloadResponse) {
    try {
      const preloaded = await deps.preloadResponse;
      if (isUsableResponse(preloaded)) return preloaded;
    } catch {
      // Preload failed (offline) — fall through to an explicit fetch.
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    deps.networkTimeoutMs ?? NAVIGATION_NETWORK_TIMEOUT_MS,
  );
  try {
    const network = await deps.fetchNetwork(request, controller.signal);
    return isUsableResponse(network) ? network : void 0;
  } catch {
    return void 0;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Resolve a document navigation with a complete, ordered fallback chain:
 *
 *   1. network (navigation preload → timed fetch); cache a copy on success
 *   2. the cached copy of *this* document (runtime "pages" cache, then precache)
 *   3. the precached branded `/offline` page
 *   4. an inline last-resort page (covers a fully cache-evicted device)
 *
 * A `no-response` outcome is structurally impossible: step 4 always returns a
 * `Response`. Steps 1–3 may each fail silently; the function only ever *returns*,
 * it never rejects.
 */
export async function handleNavigate(
  request: Request,
  deps: NavigationStrategyDeps,
): Promise<Response> {
  // 1. Network. A real HTTP response — even a 404/500 — is the truth for this
  //    URL and is returned as-is; only network *failure* falls through.
  const network = await fromNetwork(request, deps);
  if (network) {
    if (network.ok) {
      // Warm the runtime cache for the next offline load (best-effort, detached).
      void deps.putRuntime(request, network.clone()).catch(() => {});
    }
    return network;
  }

  // 2. Cached copy of this exact document: runtime cache first, then precache
  //    (the precached app-shell routes survive runtime-cache eviction).
  try {
    const runtime = await deps.matchRuntime(request);
    if (isUsableResponse(runtime)) return runtime;
  } catch {
    // ignore and continue down the chain
  }
  try {
    const precached = await deps.matchPrecache(request.url);
    if (isUsableResponse(precached)) return precached;
  } catch {
    // ignore and continue down the chain
  }

  // 3. Precached branded offline page.
  try {
    const offline = await deps.matchPrecache(OFFLINE_URL);
    if (isUsableResponse(offline)) return offline;
  } catch {
    // ignore and fall to the inline floor
  }

  // 4. Inline floor — the precache itself is gone (iOS evicted everything).
  return lastResortOfflineResponse();
}
