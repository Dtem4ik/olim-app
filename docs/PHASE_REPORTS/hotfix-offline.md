# Hotfix — offline (PWA) broken on a real device

**Severity:** production, headline feature. Offline ("works offline at the
airport") is a promise on the README and the app; it was failing on a real iPhone.

**Symptom (owner, real iPhone, airplane mode, prod):**

```
Safari не удаётся открыть страницу.
Ошибка: «FetchEvent.respondWith received an error: no-response: no-response ::
[{"url":"https://olim-app.vercel.app/plan"}]».
```

Scope: **only** the offline / service-worker fix and its verification. No features.

---

## Root cause

A document navigation to `/plan` while offline reached the service worker, every
link in the fallback chain missed, and the SW's fetch handler **resolved to
nothing** — which Serwist/Workbox surfaces as the `no-response` error Safari
printed. Two independent defects combined:

1. **serwist's `defaultCache` "pages" strategy never matches real navigations.**
   Its matcher tests `request.headers.get("Content-Type")?.includes("text/html")`.
   A GET navigation carries `Accept: text/html`, **not** `Content-Type`
   (`Content-Type` is a request-*body* header, absent on a bodyless GET). So real
   document navigations fell through the intended "pages" `NetworkFirst` cache to
   the generic `others` / final `NetworkOnly` routes.

2. **The fallback chain had a single point of failure.** The only offline safety
   net was serwist's `fallbacks` plugin doing one `matchPrecache("/offline")`. When
   that lookup returned `undefined` — which happens on a **cold or cache-evicted
   device**, exactly the state a real iPhone reaches (see iOS realities) — the
   handler's `handlerDidError` produced no response and the `no-response` error was
   re-thrown. Nothing precached the app-shell **documents** (`/plan`, `/`, …)
   either, so a route that hadn't been visited-while-online had no cached copy to
   fall back to.

Desktop `context.setOffline(true)` emulation never reproduced it because the test
always visited the route online first (populating the runtime cache) and never
exercised the cold / evicted / separate-storage states that iOS hits.

## What changed

**`lib/pwa/navigation-strategy.ts` (new) — the guarantee.** A pure,
dependency-injected `handleNavigate(request, deps)` that resolves an ordered chain
and **can never return `undefined` or reject**:

1. **Network** — navigation preload → a timed `fetch` (3s abort, so a "lie-fi"
   connection can't hang the screen); a successful response is cached for next
   time; a real HTTP error (404/500) is returned as-is.
2. **This document, cached** — runtime "pages" cache, then the precache.
3. **Precached `/offline`** — the branded fallback page.
4. **Inline last-resort HTML** — a self-contained page (no CSS/JS/font requests)
   for the pathological case where even the precache is gone (iOS evicted
   everything). This is the floor that makes `no-response` structurally impossible.

**`app/sw.ts` — own the navigation.** A runtime-caching route matching
`request.mode === "navigate"` is registered **before** `defaultCache`, so it wins
every document navigation and delegates to `handleNavigate`. `defaultCache` still
handles assets (JS/CSS/fonts/**webp images** via CacheFirst/SWR), so a
previously-viewed guide's images stay real, not grey boxes, offline.
`navigationPreload`, `skipWaiting`, `clientsClaim`, `cleanupOutdatedCaches`
unchanged; serwist's `/offline` fallback is kept as belt-and-braces. No runtime
cache warm-up on install is needed — the app-shell **documents** are precached
(below), so the navigation handler's `matchPrecache` step serves them even on a
cold, never-visited route (proven by the cold-start e2e), without any extra eager
fetch on first load.

**`next.config.ts` — precache the documents the offline promise covers.**
`additionalPrecacheEntries` now precaches the app-shell **document routes**
(`APP_SHELL_ROUTES` = `/`, `/plan`, `/guides`, `/search`, `/profile`,
`/onboarding`) plus `/offline`, each with a per-build revision (re-cached on every
deploy, so content stays fresh). This is what makes the core screens — the plan
above all — open offline on a **cold** device, not only after a prior online visit.
`/plan` renders its steps SSR'd into the precached HTML and filters them
client-side from the localStorage profile, so **the plan renders from local state
with no network at all**.

## Runtime data offline

`/plan` = precached document (all steps, SSR) + `olim.profile.v1` /
`olim.progress.v1` from localStorage → the personalized tracker builds entirely
client-side (`buildPlan`), no network request in the path. Verified by the e2e
below (offline, seeded profile → real steps render).

## iOS realities (handled, not ignored)

- **Separate storage.** A Safari **tab** and the **installed (A2HS) PWA** keep
  independent cache storage. Both paths are covered by the same SW + precache;
  both must be device-verified (checklist below).
- **~7-day eviction.** iOS may drop SW caches after ~7 days of non-use. The
  navigation chain degrades that cold state to `/offline` (or the inline floor) —
  never `no-response`. Documented in `docs/ARCHITECTURE.md → PWA & offline`.
- **Clean update.** `skipWaiting` + `clientsClaim` + `cleanupOutdatedCaches` plus
  the per-build precache revision mean an update can't leave a stale SW serving a
  broken chain.

## Automated verification

| Check | Command | Result |
|---|---|---|
| Unit — navigation guarantee | `pnpm test lib/pwa/navigation-strategy.test.ts` | ✅ 12 tests: every chain link, non-ok passthrough, timeout/abort, preload-reject, and "every dep throws → still a Response" |
| Unit — full suite | `pnpm test` | ✅ 305 tests (47 files) |
| Typecheck | `pnpm typecheck` | ✅ |
| Lint/format | `pnpm lint` | ✅ 218 files |
| Build | `pnpm build` | ✅ `/offline` + 6 app-shell routes in the precache manifest (verified in `public/sw.js`) |
| **e2e — offline** | `pnpm exec playwright test offline.spec.ts` | ✅ 4×2 (chromium + mobile): plan opens offline with real steps; cold precached routes (`/plan`, `/guides`, `/search`, `/`) open offline never-visited; a visited section renders offline; an unknown uncached route degrades to `/offline`, not an error |
| e2e — full suite | `pnpm e2e` | ✅ 45 passed, 1 skipped (DB-gated share round-trip); no regressions |
| Lighthouse (mobile) | `pnpm lighthouse` | ⚠️ **Not regressed by this fix, but a pre-existing `/plan` budget failure surfaced** — see below |

**Lighthouse — honest status.** The gate fails on **`/plan`** for two budgets:
`resource-summary.script.size` **501,639 B > 286,720 B** and performance **0.83 <
0.85**. This is **pre-existing and out of scope** for the offline fix — I proved it
by reverting `app/sw.ts` + `next.config.ts` to their pre-fix state, rebuilding, and
re-measuring `/plan`: **501,637 B, perf 0.84** — byte-identical (±2 B) and within
perf jitter. The 501 KB is the app's *total* JS: serwist precaches every static
chunk on SW install, and those fetches land in the trace window; that total grew
across phases 6–9 (auth SDK, RAG, session replay) past the 280 KB script budget.
The offline hotfix adds ~0 script bytes (it precaches 6 small **HTML** documents,
no JS). Fixing the `/plan` JS budget is a separate perf-debt task (the JS-first-load
trimming already tracked in `phase-1.md`/`phase-4.md`), not this hotfix. A11y (0.95)
and SEO gates are unaffected.

The key assertion: `offline.spec.ts` drives `context.setOffline(true)` and
navigates to `/plan`, `/`, `/guides`, and a previously-visited step, asserting a
real app document renders (bottom nav present, offline-page headline absent) —
never the browser error, never `no-response`. `navigation-strategy.test.ts` proves
the handler always returns a `Response` even when every injected dependency throws.

## Owner device checklist (run on a real iPhone — this is the part that failed last time)

Do **all** of these; a Safari tab and the installed PWA are separate — test both.

- [ ] **(a) Safari tab** — open `https://olim-app.vercel.app` online, complete/visit
  your plan once, then enable **airplane mode** → open `/plan`. The plan must render
  (your steps, progress), not an error.
- [ ] **(b) Installed PWA** — Share → **Add to Home Screen**; open the installed app
  online once (visit the plan); then airplane mode → open the app and navigate to
  **Мой план**. Must render offline.
- [ ] **(c) Images** — in either mode, open a guide **section you viewed online**
  while offline; its photos should render (not grey boxes).
- [ ] **(d) Cold install** — on a device that has **never** opened the site, add to
  home screen / open in airplane mode: you should see the branded **offline page**
  ("Нет соединения"), never Safari's error.
- [ ] **(e) After update** — deploy, open online once (lets the new SW take over),
  then airplane mode → `/plan` still works (no stale broken SW).

Report any `no-response` or blank page with the exact URL and whether it was the
tab or the installed PWA.

## Docs corrected

- `docs/PHASE_REPORTS/phase-5.md` — added a correction banner: the "offline fully
  verified" claim was desktop-emulation only (the real-device gap was debt #4).
- `docs/ARCHITECTURE.md → PWA & offline` — the navigation chain, app-shell document
  precache, and the iOS caveats (separate storage, ~7-day eviction).
- `AGENTS.md → Known traps` — two new traps: "SW offline must be verified on a real
  device in BOTH a Safari tab and the installed PWA (separate storage)", and
  "serwist's defaultCache pages matcher never matches real navigations".

## Files touched

- `lib/pwa/navigation-strategy.ts` (new), `lib/pwa/navigation-strategy.test.ts` (new)
- `app/sw.ts`, `next.config.ts`
- `tests/e2e/offline.spec.ts` (new)
- `docs/ARCHITECTURE.md`, `docs/PHASE_REPORTS/phase-5.md`, `AGENTS.md`, this report
