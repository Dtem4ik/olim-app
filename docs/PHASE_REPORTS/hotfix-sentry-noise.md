# Hotfix — Sentry noise after the domain move

## Done

Three unhandled issues appeared in Sentry (`vercel-production`) after moving to
`olimguide.online`:

| Issue | Cause | Fix |
| --- | --- | --- |
| OLIM-APP-3 `SecurityError: Failed to register a ServiceWorker…` | `SerwistProvider` registers fire-and-forget (`void serwist.register()`), so any rejection is an unhandled rejection. `SecurityError` comes from browsers that refuse SWs (Firefox private mode, storage/cookies blocked, some in-app WebViews). | `SerwistProvider register={false}` + `components/pwa/service-worker-registrar.tsx`, which registers via `lib/pwa/register.ts` (catches, `console.warn`, app continues without offline). |
| OLIM-APP-4 `AbortError: Failed to register a ServiceWorker…` | Same path; the sw.js fetch / first SW start aborted (flaky network, tab closed). | Same as above. |
| OLIM-APP-5 `InvalidNodeTypeError: Failed to execute 'selectNode' on 'Range'` | Not our code (nothing in the repo calls `Range#selectNode`); typical of extensions / in-page translators mutating the React-owned DOM. 1 event, 0 users. | `ignoreErrors` + extension `denyUrls` in `lib/monitoring/sentry-filters.ts`, wired into `Sentry.init`. |

The domain move itself explains the timing: every visitor on the new origin is a
first-time SW install, so the registration path ran for everyone at once.

## Deferred

- Resolve OLIM-APP-3/4/5 in the Sentry UI after this deploys (no Sentry API access
  from the session).

## Verification

```
pnpm lint        # biome: 234 files, no issues
pnpm typecheck   # clean
pnpm test        # 51 files, 323 tests passed (new: lib/pwa/register.test.ts, lib/monitoring/sentry-filters.test.ts)
pnpm build       # ok
pnpm e2e         # 76 passed, 16 skipped (env-gated) — incl. tests/e2e/offline.spec.ts: SW still registers and serves offline
```

Lighthouse not re-run: the change adds one tiny client component with no
render-affecting output.
