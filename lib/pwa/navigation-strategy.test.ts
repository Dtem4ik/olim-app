import { describe, expect, it, vi } from "vitest";
import {
  APP_SHELL_ROUTES,
  handleNavigate,
  type NavigationStrategyDeps,
  OFFLINE_URL,
} from "./navigation-strategy";

const NAV_URL = "https://olim-app.vercel.app/plan";

function htmlResponse(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    ...init,
  });
}

/** All chain links dead by default; each test enables just the link it exercises. */
function deps(over: Partial<NavigationStrategyDeps> = {}): NavigationStrategyDeps {
  return {
    preloadResponse: undefined,
    fetchNetwork: () => Promise.reject(new TypeError("Failed to fetch")),
    matchRuntime: () => Promise.resolve(undefined),
    putRuntime: () => Promise.resolve(),
    matchPrecache: () => Promise.resolve(undefined),
    networkTimeoutMs: 50,
    ...over,
  };
}

// `mode: "navigate"` can't be set via the Request constructor (only the browser
// sets it); the SW route matcher checks it, but this pure handler treats the
// request opaquely — so a plain same-URL request exercises the same code paths.
const request = () => new Request(NAV_URL);

describe("handleNavigate — the no-response guarantee", () => {
  it("returns the network response and caches it when online", async () => {
    const putRuntime = vi.fn(() => Promise.resolve());
    const res = await handleNavigate(
      request(),
      deps({ fetchNetwork: () => Promise.resolve(htmlResponse("<h1>plan</h1>")), putRuntime }),
    );
    expect(await res.text()).toContain("plan");
    expect(putRuntime).toHaveBeenCalledOnce();
  });

  it("returns a non-ok network response as-is and does NOT cache it", async () => {
    const putRuntime = vi.fn(() => Promise.resolve());
    const res = await handleNavigate(
      request(),
      deps({
        fetchNetwork: () => Promise.resolve(htmlResponse("not found", { status: 404 })),
        putRuntime,
      }),
    );
    expect(res.status).toBe(404);
    expect(putRuntime).not.toHaveBeenCalled();
  });

  it("falls back to the runtime-cached document when the network fails", async () => {
    const res = await handleNavigate(
      request(),
      deps({ matchRuntime: () => Promise.resolve(htmlResponse("<h1>cached plan</h1>")) }),
    );
    expect(await res.text()).toContain("cached plan");
  });

  it("falls back to the precached app-shell document when nothing is in runtime cache", async () => {
    const matchPrecache = vi.fn((url: string) =>
      Promise.resolve(url === NAV_URL ? htmlResponse("<h1>precached plan</h1>") : undefined),
    );
    const res = await handleNavigate(request(), deps({ matchPrecache }));
    expect(await res.text()).toContain("precached plan");
  });

  it("falls back to the precached /offline page when the route itself is uncached", async () => {
    const matchPrecache = vi.fn((url: string) =>
      Promise.resolve(url === OFFLINE_URL ? htmlResponse("<h1>offline</h1>") : undefined),
    );
    const res = await handleNavigate(request(), deps({ matchPrecache }));
    expect(await res.text()).toContain("offline");
  });

  it("still returns an inline document when EVERY cache is evicted (cold iOS)", async () => {
    // Network dead, runtime cache empty, precache fully gone → the floor.
    const res = await handleNavigate(request(), deps());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(await res.text()).toContain("Нет соединения");
  });

  it("never rejects and never resolves undefined, no matter which links throw", async () => {
    // Every injected dependency throws — the pathological device state.
    const explode = () => Promise.reject(new Error("boom"));
    const res = await handleNavigate(
      request(),
      deps({
        preloadResponse: Promise.reject(new Error("preload boom")),
        fetchNetwork: explode,
        matchRuntime: explode,
        putRuntime: explode,
        matchPrecache: explode,
      }),
    );
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
  });

  it("prefers a usable navigation-preload response over an explicit fetch", async () => {
    const fetchNetwork = vi.fn(() => Promise.resolve(htmlResponse("<h1>via fetch</h1>")));
    const res = await handleNavigate(
      request(),
      deps({
        preloadResponse: Promise.resolve(htmlResponse("<h1>via preload</h1>")),
        fetchNetwork,
      }),
    );
    expect(await res.text()).toContain("via preload");
    expect(fetchNetwork).not.toHaveBeenCalled();
  });

  it("falls through to fetch when navigation preload rejects (offline)", async () => {
    const res = await handleNavigate(
      request(),
      deps({
        preloadResponse: Promise.reject(new Error("no preload offline")),
        fetchNetwork: () => Promise.resolve(htmlResponse("<h1>via fetch</h1>")),
      }),
    );
    expect(await res.text()).toContain("via fetch");
  });

  it("does not hang on a stalled network — it aborts and falls back", async () => {
    // fetch that never settles unless aborted; the timeout must rescue us.
    const fetchNetwork = (_req: Request, signal: AbortSignal) =>
      new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    const res = await handleNavigate(
      request(),
      deps({
        fetchNetwork,
        networkTimeoutMs: 20,
        matchRuntime: () => Promise.resolve(htmlResponse("<h1>cached</h1>")),
      }),
    );
    expect(await res.text()).toContain("cached");
  });
});

describe("APP_SHELL_ROUTES", () => {
  it("covers the offline promise: the plan and the core screens", () => {
    for (const route of ["/", "/plan", "/guides", "/search", "/profile"]) {
      expect(APP_SHELL_ROUTES).toContain(route);
    }
  });
});
