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
- **`/plan` My plan** — the full plan grouped by stage with shared checkboxes.
- **`/profile`** — answers summary, edit/reset, theme toggle, language placeholder.

**Content repository** (`lib/content/repo.ts`, server-only): reads from Supabase
(anon key, RLS public read) and falls back to the committed fixtures when no
stack is configured or it is empty — so screens render in CI (no DB), locally
(full content), and in a preview before the shared remote is seeded. Local
builds point at the `supabase start` stack via `.env.{development,production}.local`
(gitignored; Vercel is unaffected).

**Progress store** (`lib/plan/progress.ts` + `use-progress.ts`): checked steps
keyed by slug in `olim.progress.v1`, shared across screens via
`useSyncExternalStore`. Deliberately small and swappable for DB-backed plans in
Phase 5.

**"Outdated?" report**: a Server Action (`app/guides/actions.ts`) inserts into
`step_reports` (RLS insert-only) — keeps the Supabase SDK off the client bundle.

**Analytics & errors** (`components/analytics-provider.tsx`, `lib/analytics.ts`):
PostHog (`quiz_completed`, `step_done`, `section_opened`, `report_outdated`,
pageviews) and Sentry, both dynamically imported and **env-gated** — silently
disabled without their `NEXT_PUBLIC_*` keys (local/CI), enabled in prod.

## Rendering & performance

Both routes are statically prerendered. Lucide icon components can't cross the
server/client boundary as props, so nav that needs icons lives in small client
wrappers (`SiteBottomNav`). Placeholder links use `prefetch={false}` until their
routes exist. See `docs/PHASE_REPORTS/phase-1.md` for the JS-budget note.

## CI

`.github/workflows/ci.yml`: `verify` (lint → typecheck → unit+coverage → build)
and `content` (schema + integrity + editorial lint on the fixtures) run in
parallel; `e2e` (Playwright + axe) and `lighthouse` follow `verify`. Vercel builds
PR previews independently.
