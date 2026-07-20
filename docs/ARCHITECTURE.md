# Architecture

The system design of Olim App. Created in Phase 1; keep it current as later phases
add data, personalization, search and native wrappers.

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | React 19, RSC by default |
| Language | TypeScript 5 (strict) | `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, no `any` |
| Styling | Tailwind CSS v4 | CSS-first config in `app/globals.css` (`@theme inline`) |
| Components | shadcn/ui + custom | primitives copied via the shadcn CLI, adapted to our tokens |
| Icons | lucide-react | named imports (tree-shaken) |
| i18n | next-intl 4 | single-locale (RU) now, EN keys ready; no locale routing yet |
| Theming | next-themes | `class` strategy, system + manual toggle |
| Lint/format | Biome 2 | one tool for both |
| Git hooks | lefthook | pre-commit: Biome + typecheck on staged; commit-msg: commitlint |
| Unit tests | Vitest + Testing Library | jsdom, coverage via v8 |
| E2E / a11y | Playwright + @axe-core/playwright | smoke + axe in both themes, Desktop + mobile |
| Perf budgets | Lighthouse CI | perf ≥90, a11y ≥95 enforced |
| PWA | serwist (`@serwist/next`) | manifest, service worker, offline (Phase 5c) |
| Hosting | Vercel | PR previews, brotli-compressed assets |

## Directory layout

```
app/                 App Router routes
  layout.tsx         html shell, fonts, ThemeProvider + NextIntlClientProvider
  page.tsx           home (server component)
  globals.css        Tailwind entry + design tokens (light/.light, .dark)
  dev/ui/page.tsx    UI-kit showcase (single theme, toggled)
components/          product components (SectionTile, StepCard, …)
  ui/                shadcn primitives (Button, Card, Badge, Input, Checkbox,
                     Empty, InputGroup, Field, Label, Separator, Textarea)
app/onboarding/      quiz route (server: loads fixtures → client flow)
components/onboarding/ onboarding quiz + plan preview (client)
lib/                 pure, unit-tested logic (deadline, cn) + *.test.ts
  content/           schema (client-safe vocabulary), tables (server), bundle loader, lint
  plan/              condition engine (build-plan), profile store, persona snapshots
  supabase/          generated database.types.ts
supabase/            Supabase CLI project: config.toml + migrations/
scripts/             content CLI (validate, import, check-links, review-queue)
content/fixtures/    committed content subset for tests/dev (real content is private)
i18n/request.ts      next-intl request config (locale + messages)
messages/            ru.json (shipping), en.json (keys ready)
test/                Testing Library render helper (providers)
tests/e2e/           Playwright specs
```

## Design tokens & theming

Semantic tokens are CSS variables defined in `app/globals.css` and mapped into
Tailwind via `@theme inline`, so components only ever use semantic utilities
(`bg-surface`, `text-muted-foreground`, `bg-primary`) — **hardcoded colors are a
review blocker** (AGENTS.md rule #4). Colors are authored in `oklch` for smooth,
perceptually-even light/dark ramps.

- `:root, .light` — light palette. `.dark` — dark palette.
- Dark mode: `next-themes` toggles a `.dark` class on `<html>`, seeded from
  `prefers-color-scheme`, overridable by the manual `ThemeToggle`.
- `.light` mirrors `:root` so a subtree can be pinned to light if ever needed.
- shadcn aliases (`--card`, `--popover`) point at our surface tokens so canonical
  `npx shadcn add …` output drops in without edits.

All colored badges/buttons use **solid** fills (not translucent tints): their
contrast is deterministic and verified AA in both themes by the axe e2e.

## Components

**Primitives** (`components/ui/*`) are shadcn/ui, copied via the CLI and adapted:
default/lg/icon sizes are ≥44px tap targets; Badge gained `success`/`warning`
variants; Input is `h-11`. `asChild` composition uses `@radix-ui/react-slot`; the
newer primitives (`Field`, `Label`, `Separator`) import from the `radix-ui`
umbrella package. Registry primitives in the kit: `Button`, `Card`, `Badge`,
`Input`, `Checkbox`, `Empty`, `InputGroup`, `Field` (+ `Label`, `Separator`,
`Textarea`).

**Product components** (`components/*`) compose those primitives (shadcn-first
policy, see `AGENTS.md`) and never reimplement them:
- `EmptyState` → composes `Empty` (icon/title/description/action).
- `SearchBar` → composes `InputGroup` (leading search addon + clear button),
  bumped to `h-11`.
- `ChecklistItem` → composes `Field` content parts + the Radix `Checkbox`; the row
  stays a wrapping `<label>` (not `FieldLabel`/`htmlFor`) so the whole ≥44px row is
  a single tap target.
- `DeadlineBadge` → composes `Badge` (urgency variant from the pure
  `lib/deadline.ts`).
- `StepCard` → composes `Card` + `Badge`; `SectionTile` → composes `Badge`.
- `BottomNav` / `SectionTile` are legitimately custom: the registry has no mobile
  tab bar and no 2-D tile (its `Item` is a horizontal row). See the Phase 1.5 audit
  in `docs/PHASE_REPORTS/phase-1.5.md`.

Also `ThemeToggle` and `SiteBottomNav`. Content-bearing components take strings as
props (content is data); chrome strings come from next-intl dictionaries.

## i18n

Single-locale setup for now: `i18n/request.ts` returns locale `ru` and its
messages; `next.config.ts` wires the next-intl plugin. Server components read
translations via `getTranslations`; client components via `useTranslations` under
the `NextIntlClientProvider` mounted in the root layout. Plural-aware strings use
ICU syntax (e.g. deadline countdowns). Locale routing (`/[locale]`) and the EN
switch are deferred to a later phase.

## Data layer (Phase 2)

**Supabase (Postgres) on a SHARED cloud project.** The project is shared with the
production portfolio site (dtem4ik.dev), which owns the `portfolio` schema. Olim
App owns the `public` schema ONLY; migrations are additive and `public`-scoped,
and destructive commands against the linked remote are forbidden (AGENTS.md rules
6 & 7). Local development runs the full stack via the `supabase` CLI + Docker.

**Schema** (`supabase/migrations/*_init_content_schema.sql`, all in `public`):

| Table | Purpose | RLS |
|---|---|---|
| `sections` | top-level guide sections | public read |
| `steps` | guide steps (`body_md`, `docs`, `warn_rule`, `tips`, `cond` jsonb; `source_url`, `last_verified_at`, `needs_review`) | public read |
| `benefits` | dated amount tables (sal klita…), unique per `(slug, valid_from)` | public read |
| `plans` | trackable plan (`share_slug`, `answers`, `done_step_ids`, nullable `user_id`) | insert by anyone; owner read/update; slug read via SECURITY DEFINER `get_plan_by_share_slug()` |
| `step_reports` | "this step looks outdated" reports | insert-only |
| `user_state` | one synced row per account (`answers`, `done_step_ids`, reminder prefs, `unsubscribe_token`); Phase 7a | owner read/write/delete (authenticated) |
| `reminder_log` | reminder idempotency: unique `(user_id, step_slug, threshold_days)`; Phase 7b | owner read; service-role writes |

RLS is on from day one. Content tables are world-readable and take no client
writes (the import uses the service-role key, which bypasses RLS). Table
privileges are granted explicitly because new-table auto-exposure is disabled
(current Supabase default). CHECK constraints (kebab slugs, https `source_url`,
length caps, `share_slug` ≥12) mirror the zod schemas.

**Type safety.** `lib/content/schema.ts` holds zod schemas mirroring every table
plus the `cond` condition language (stage/basis/country/family/pet/children_ages/
months_in_country) and `warn_rule` types; these vocabularies are the shared source
of truth for the Phase 3 quiz. `lib/supabase/database.types.ts` is generated from
the local DB.

**Content pipeline** (`lib/content/*`, `scripts/*`). Content is authored as JSON
bundles (`sections`/`steps`/`benefits`). The loader validates each file against the
schema, merges them, and runs cross-file integrity checks; the lint enforces a
trusted-source allowlist, banned phrases, and verification freshness. Real content
lives in the private `olim-content` repo (a sibling dir); `content/fixtures/`
holds a committed subset for tests/dev. Scripts: `content:validate` (CI gate),
`content:import` (idempotent upsert, LOCAL by default, refuses remote without
`--allow-remote`), `content:check-links` (non-blocking), `content:review-queue`.
Format documented in `docs/CONTENT_SCHEMA.md`.

## Personalization (Phase 3)

**Onboarding quiz** (`app/onboarding`, `components/onboarding/`). A client flow of
one-question-per-screen: stage, basis, country, family (+ children ages when
relevant), pet, arrival/flight date (conditional on stage), city. Answers build a
**versioned localStorage profile** (`olim.profile.v1`) validated by
`lib/plan/profile.ts`. The quiz options come straight from the content
vocabularies (`stageSchema.options`, `basisSchema.options`, …) — no parallel
enums. The server route loads fixture steps via the content loader and hands them
to the client; the engine runs client-side to render a stage-grouped plan preview.

**Condition engine** (`lib/plan/build-plan.ts`) — the product core, 100%
unit-tested. `buildPlan(answers, steps)` is a pure function that:
- filters steps by the `cond` language (stage, basis, country, family, pet,
  `children_ages` / `months_in_country` ranges); an absent key is no constraint,
  and a condition needing an answer the person did not give does not match;
- sorts by lifecycle stage (`preparing → just_landed → first_months → settled`,
  no-stage last) then `sort_order` then slug;
- attaches deadline warnings from each step's `warn_rule` + the person's flight /
  arrival dates, reusing `getDeadlineStatus` (`lib/deadline.ts`).

Six reference personas are snapshot-tested (`lib/plan/personas.test.ts`) to prove
different answers yield meaningfully different plans. Real Supabase wiring of the
home/plan/section screens is Phase 4; Phase 3 proves the engine end-to-end against
the committed fixtures.

## Screens & data flow (Phase 4)

Mobile-first App Router screens, all under a shared `BottomNav` (Home / My plan /
Guides / Profile):

- **`/` Home** (`components/home`): server component reads sections+steps via the
  content repo and hands them to a client view that hydrates the localStorage
  profile, computes the plan with `buildPlan`, and renders a contextual greeting,
  a "burning deadlines" block, the next 3 unchecked steps, and the sections grid
  with per-section counts. No profile → invites to the quiz.
- **`/guides`** — sections index (counts personalized when a profile exists).
- **`/guides/[section]`** — server-rendered section; each step is an expandable
  card (chosen over a separate route for a faster, in-context mobile flow):
  short answer → "bring with you" → checkable steps → community tip → trust footer
  (`last_verified_at`, official-source link, "Информация устарела?"). Step bodies
  are rendered server-side (`lib/markdown.ts`, no client markdown dep).
- **`/plan` My plan** — the full **tracker** (Phase 5a): a plan-scoped progress
  bar, all/burning/done filters (a `Tabs` primitive on the `radix-ui` umbrella),
  and steps grouped by stage with shared checkboxes. Home de-emphasizes
  personalized sections with 0 matched steps (dashed border + muted icon, still
  tappable — never hidden, to keep discoverability; AA contrast preserved).
- **`/profile`** — answers summary, edit/reset, theme toggle, language placeholder.

**Content repository** (`lib/content/repo.ts`, server-only): reads from Supabase
(anon key, RLS public read) and falls back to the committed fixtures when no
stack is configured or it is empty — so screens render in CI (no DB), locally
(full content), and in a preview before the shared remote is seeded. Local
builds point at the `supabase start` stack via `.env.{development,production}.local`
(gitignored; Vercel is unaffected).

**Progress store** (`lib/plan/progress.ts` + `use-progress.ts`): checked steps
keyed by slug in `olim.progress.v1`, shared across screens via
`useSyncExternalStore`. Deliberately small; the shared-plan snapshot reuses it.

**"Outdated?" report**: a Server Action (`app/guides/actions.ts`) inserts into
`step_reports` (RLS insert-only) — keeps the Supabase SDK off the client bundle.
Hardened in Phase 5: the comment is zod-validated + length-capped server-side
(mirrors the DB CHECK) and writes are rate limited (`lib/rate-limit.ts`, per IP).

**Analytics & errors** (`components/analytics-provider.tsx`, `lib/analytics.ts`):
PostHog (`quiz_completed`, `step_done`, `section_opened`, `report_outdated`,
`plan_shared`, pageviews) and Sentry, both dynamically imported and **env-gated**
— silently disabled without their `NEXT_PUBLIC_*` keys (local/CI), enabled in prod.

## Sharing (Phase 5b)

A person can share their plan as a read-only link:

- **Create** (`app/plan/actions.ts` → `sharePlan`, a Server Action): inserts an
  anonymous `plans` row (RLS: anon insert with `user_id` null). The `share_slug`
  is a dependency-free crypto-random URL-safe id ≥16 chars (`lib/share/share-slug.ts`,
  above the AGENTS.md ≥12 security bar). Inputs are zod-validated and rate limited
  like the report action.
- **Privacy** (`lib/share/shared-plan.ts`): the stored `answers` snapshot is
  sanitized to only the `cond`-relevant fields — **never city, flight/arrival
  dates, or any free text**. Because dates are dropped, the shared view shows no
  deadline badges (they'd leak the arrival date). So even a direct call to the
  `get_plan_by_share_slug` RPC reveals nothing identifying.
- **Read** (`/plan/[slug]`): a server component loads the row via the SECURITY
  DEFINER `get_plan_by_share_slug` RPC through a React-`cache`d loader
  (`lib/share/load-shared-plan.ts`) shared by the page, its metadata and the OG
  image; it rebuilds the matched steps with `buildPlan` and renders stage-grouped
  titles with done-marks, a progress bar, and a "build your own plan" CTA. The
  page is `noindex`.
- **Unfurl**: a dynamic OG image (`app/plan/[slug]/opengraph-image.tsx`, `next/og`)
  renders brand + progress % + a stage summary, loading a Cyrillic-capable Inter
  TTF with a graceful fallback (`lib/og/font.ts`). `metadataBase` (`lib/site-url.ts`)
  gives absolute URLs for Telegram/WhatsApp.
- **Share UX** (`components/plan/share-plan-button.tsx`): Web Share API on mobile,
  clipboard fallback on desktop; emits the `plan_shared` event.

## PWA & offline (Phase 5c)

Installable, offline-capable app via **serwist** (`@serwist/next`):

- **Manifest** (`app/manifest.ts`, a localized metadata route) + a monochrome
  navigator-sparkle icon set (`public/icons/`, generated by
  `scripts/generate-icons.ts` / `pnpm icons`); `standalone` display, apple-touch
  icon, per-mode `themeColor` via the root-layout viewport.
- **Service worker** (`app/sw.ts`): precaches the app shell + static assets +
  the `/offline` fallback (added with a per-build revision). `defaultCache`
  runtime caching — a NetworkFirst "pages" + RSC-prefetch cache means visited and
  prefetched guides and **Мой план** open with no network (the airport scenario);
  anything uncached falls back to the branded `/offline` page. Registered by
  `SerwistProvider` in the root layout.
- **Update flow**: `skipWaiting` + `clientsClaim` + `cleanupOutdatedCaches` — a
  new SW (its precache keyed by content hashes) takes over on the next navigation
  and prunes stale caches, so no cache lives forever across deploys.
- **Build note**: `@serwist/next` is a **webpack** plugin and does not run under
  Turbopack, so the production `build` script uses `next build --webpack`
  (`SERWIST_SUPPRESS_TURBOPACK_WARNING=1`). `pnpm dev` stays on Turbopack; the SW
  is disabled in dev so it never fights HMR. `public/sw.js` is generated, not
  committed (gitignored).

## Search (Phase 6a)

Full-text search over steps, served by the DB with a dependency-free fallback.

- **DB path.** `steps.search_vector` is a STORED generated `tsvector` (russian
  config, weighted title > summary > body) with a GIN index, plus pg_trgm GIN
  indexes on title & summary. The `public.search_steps(query, limit)` RPC
  (`SECURITY INVOKER`, public-read RLS) ranks FTS matches first
  (`websearch_to_tsquery` + `ts_rank`) with **word** similarity (`<%` /
  `word_similarity`, not full-string `%`) as the typo/partial safety net — full
  similarity dilutes to near-zero on long multi-word titles. Migration
  `20260717120000_add_step_search.sql`. Because the vector is a generated column it
  stays correct on every `content:import` upsert with no trigger.
- **Transliteration.** Domain terms are transliterated Hebrew in Cyrillic (купат
  холим, рав-кав, теудат зеут); the stemmer keeps them near-verbatim so exact forms
  match via FTS, and word-similarity covers typos (купат **халим**).
- **Fallback.** `lib/search/match.ts` is a pure matcher (substring + a JS
  `word_similarity` analogue) used when no stack is configured — CI e2e, a preview
  before the remote is seeded, local dev without Docker — so the same exact/partial/
  typo flows work without a database. `lib/search/search.ts` picks DB-or-fallback.
- **API + UI.** `GET /api/search?q=` (`lib/search/search.ts`) returns grouped
  `{ steps, sections }`. `components/search/search-view.tsx` debounces (200ms, an
  `AbortController` drops stale requests), groups results steps → section photo
  tiles, suggests sections when empty, keeps query-restore-on-back, and emits
  `search_performed` through the env-gated analytics facade. Local perf: 6–28ms
  over the full 46-step set (<150ms target).

## Programmatic SEO (Phase 6b)

Built on the redesign's SSR step sheets — no separate public route was added.

- **Canonical pages.** The existing `/guides/[section]/[step]` URLs (sheet raised,
  full SSR content, own `<title>`/description/`<h1>`) **are** the canonical step
  pages; `/guides/[section]` are the section pages. Each sets
  `alternates.canonical` + OpenGraph. A dedicated `/gid/...` route was rejected: it
  would duplicate content and split link equity for no gain.
- **Discovery.** `app/sitemap.ts` builds `sitemap.xml` from the DB (home, guides,
  every section + step; step `lastModified` from `last_verified_at`).
  `app/robots.ts` allows the guides, disallows `/plan`, `/api`, and the utility
  screens; `/plan/[slug]` also carries `noindex`.
- **Structured data.** `lib/seo/structured-data.ts` emits only honest JSON-LD: a
  `BreadcrumbList` always; a `HowTo` (steps parsed from the body's list, "bring with
  you" docs → `HowToSupply`) **only** when the body genuinely lists ≥2 actions; an
  `ItemList` of steps for sections. Rendered via `components/seo/json-ld.tsx`.
- **OG images.** Per-page `opengraph-image` routes for section + step reuse the
  Phase 5 `next/og` infra (`lib/og/guide-image.tsx`: `loadInter`, the rotated-square
  brand mark, the dark-token palette).
- **RU-first.** Content and JSON-LD `inLanguage` are Russian (the audience googles
  in Russian). Lighthouse SEO is 100 on home/guides/section/step locally.

## Content freshness (Phase 6b — closes the Phase 4 static-baking debt)

New content must not require a redeploy. The content routes and the sitemap use
**ISR** (`export const revalidate = 3600`), and `scripts/content-import.ts` pings an
on-demand **`POST /api/revalidate`** (shared-secret `REVALIDATE_SECRET`) after a
successful import, which `revalidatePath("/", "layout")` — regenerating home,
guides, every section/step, and the sitemap on their next request. The import hook
is a no-op unless `SITE_REVALIDATE_URL` + `REVALIDATE_SECRET` are set, so local
imports skip it.

## Client UX: step sheet & navigation feedback (Phase 6)

- **Step sheet is a custom inline drawer, not shadcn's `Drawer`.** The redesign's
  step view is a bottom sheet (`components/ui/bottom-sheet.tsx`) rendered **inline,
  without a portal**, so a deep-linked step SSRs its content (h1, body, JSON-LD) for
  SEO / no-JS. Portal-based drawers (vaul, Base UI) render nothing on the server —
  tested and rejected (see `docs/PHASE_REPORTS/phase-6.md`). The sheet implements
  drawer behaviour by hand: velocity drag-to-close, focus trap + return, scroll-lock,
  Escape, backdrop.
- **Navigation feedback is one top progress bar** (`components/top-progress-bar.tsx`,
  in the root layout): a slim accent bar that starts on an internal link click and
  finishes on the `usePathname` change. It uses only `usePathname` (not
  `useSearchParams`) so it never forces dynamic rendering.

## Accounts & sync (Phase 7a)

**Anonymous-first stays.** An account is never required; signing in adds exactly
two things — cross-device sync and deadline reminders.

- **Auth.** Supabase Auth (magic link + Google OAuth) via `@supabase/ssr`. The
  browser client (`lib/supabase/browser.ts`) stores the session in **cookies** and
  is **code-split onto the `/profile` route only** (the auth SDK is ~69KB gz —
  measured, kept out of the global bundle). The server client
  (`lib/supabase/server.ts`) reads those cookies in route handlers; the
  `/auth/callback` route exchanges the code for a session. A service-role admin
  client (`lib/supabase/admin.ts`, server-only) is used for account deletion.
  **No global middleware** — content/SEO routes never read auth cookies, so
  Phase 6's ISR/static rendering is untouched.
- **Storage model — a dedicated `user_state` table, NOT an overload of `plans`.**
  `plans` are ephemeral, publicly-readable-by-slug, **sanitized** share snapshots
  (many per person, no city/dates); the account's live state (full profile
  answers, checked steps, reminder prefs) is one owner-only row with a different
  lifecycle and privacy model. `user_state` (`user_id` PK → `auth.users`, `ON
  DELETE CASCADE`): `answers`, `done_step_ids`, `reminders_enabled`,
  `reminder_lead_days`, `unsubscribe_token`. Owner-scoped RLS (authenticated only);
  cross-user denial is e2e-tested.
- **Migration on first sign-in + sync.** A global `SyncProvider`
  (`components/sync-provider.tsx`, plain `fetch` — no SDK) bootstraps against
  `POST /api/state`: server answers win, done-steps are **unioned**, and this
  device's anonymous share-plans are claimed via the `SECURITY DEFINER`
  `claim_plans` RPC (their slugs are recorded locally on share). Ongoing local
  changes write through (`PUT /api/state`, debounced). The profile became a
  **reactive store** (`lib/plan/use-profile.ts`, mirroring `use-progress.ts`) so a
  synced plan updates every screen without a reload. localStorage stays the
  offline cache — the PWA works signed-in and signed-out; sign-out keeps the cache.
- **Account deletion.** Profile → delete → `POST /api/account/delete` hard-deletes
  the `auth.users` row (admin API); `user_state` + `reminder_log` cascade, owned
  share-plans are disassociated (`plans.user_id` → NULL). Documented in
  `docs/PRIVACY.md`.

## Deadline reminders (Phase 7b)

Opt-in per user (off by default); lead time 30/14/7 days, stored on `user_state`.

- **Shared date math.** `lib/plan/deadline-math.ts` is dependency-free and the
  **single source of truth** for the app's `computeWarning` (no-extension import)
  and the Deno reminder Edge Function (relative `.ts` import) — no drift.
  `lib/reminders/compute.ts` (`computeDueReminders`) is the unit-tested selection
  reference the Edge Function mirrors.
- **Engine.** `supabase/functions/send-reminders` (Deno cron, `verify_jwt=false`,
  excluded from tsc/biome) reads opted-in users + steps with a `warn_rule`,
  computes deadlines in the lead window, **claims** each `(user, step, threshold)`
  in `reminder_log` (unique → idempotent, never fires twice), and emails a RU
  reminder via **Resend** (deep link to the step + one-click, no-login unsubscribe
  at `/api/reminders/unsubscribe?token=…`). Without `RESEND_API_KEY` it dry-runs
  (claims + reports, never sends). Cron is scheduled outside the repo (dashboard).
- **Settings.** `PATCH /api/reminders` (owner-scoped) writes the toggle + lead
  time; the Profile screen renders them (signed-in only).

## Rendering & performance

Content routes are ISR (see freshness above); other routes are statically
prerendered. Lucide icon components can't cross the
server/client boundary as props, so nav that needs icons lives in small client
wrappers (`SiteBottomNav`). Placeholder links use `prefetch={false}` until their
routes exist. See `docs/PHASE_REPORTS/phase-1.md` for the JS-budget note.

## CI

`.github/workflows/ci.yml`: `verify` (lint → typecheck → unit+coverage → build)
and `content` (schema + integrity + editorial lint on the fixtures) run in
parallel; `e2e` (Playwright + axe) and `lighthouse` follow `verify`. Vercel builds
PR previews independently.
