# Phase 4 — Home and sections

Status: **complete** (housekeeping · 4a home · 4b section & step card).

Branch: `phase-4/home-and-sections`. Commits:
- `chore: housekeeping — archive phase prompts, correct budget wording`
- `feat(app): personalized home, guides, sections & step cards (Phase 4a/4b)`
- `test(app): e2e home/section flow + unit tests; lighthouse per-route budget`
- plus this report.

Scope held: no full plan tracker/sharing/PWA (Phase 5), no search (Phase 6, its
`/search` nav tab was removed until then), no accounts (Phase 7).

---

## Housekeeping ✅ (first commit)

- Phase prompts moved to `docs/PROMPTS/` (committed; no secrets).
- Corrected the stale JS-budget wording in `AGENTS.md` and the Lighthouse CI job
  name to the real per-route guard.
- **`olim-content` gained its own CI** — a `validate content` workflow that checks
  out `olim-app` alongside and runs `pnpm content:validate --dir` (pushed to that
  private repo, `e0a6c1a`). Closes the Phase 2 debt.

## 4a — Home: "your situation" ✅

- `/` is now the personalized home. With a profile it shows a stage-based greeting
  (+ months-in-country / city when known), a **burning-deadlines** block (plan
  warnings, overdue → today → soon), the **next 3** unchecked steps, and the
  **sections grid** with per-section step counts from the personal plan. Without a
  profile it invites to the quiz.
- **Data flow:** server components read sections/steps from Supabase (anon key,
  RLS public read) via `lib/content/repo.ts`, which **falls back to the committed
  fixtures** when no stack is configured or it is empty — so screens render in CI
  (no DB), locally (full 8/46/4 content), and in a preview before the shared
  remote is seeded. Local builds target the `supabase start` stack via
  `.env.{development,production}.local` (gitignored; Vercel unaffected).
- **Progress store** `olim.progress.v1` (`lib/plan/progress.ts` + `use-progress.ts`)
  — slug-keyed, shared across screens via `useSyncExternalStore`, swappable for
  Phase 5 DB plans.
- **BottomNav wired for real:** Home / My plan / Guides / Profile, each a working
  route.
- **Analytics + errors:** PostHog (`quiz_completed`, `step_done`, `section_opened`,
  `report_outdated`, pageviews) and Sentry, dynamically imported and **env-gated**
  — silent without `NEXT_PUBLIC_*` keys (local/CI), enabled in prod.

## 4b — Section screen & step card ✅

- `/guides` (index) and `/guides/[section]`: each step is an **expandable card**
  (chosen over a separate route — faster, in-context mobile flow; deep links from
  Home use `#slug` to auto-expand and scroll). Card = short answer → "bring with
  you" (docs) → checkable steps → community tip → **trust footer** (`last_verified_at`,
  official-source link, "Информация устарела?"). Step bodies are rendered
  server-side (`lib/markdown.ts`; no client markdown dependency).
- **"Outdated?" works:** a **Server Action** (`app/guides/actions.ts`) inserts into
  `step_reports` (RLS insert-only) — verified writing a real row to the local
  stack (`reason=outdated`, free-text → `comment`). Running as a Server Action also
  keeps the Supabase SDK off the client bundle (−~59KB on the section route).
- Checking a step on Home / My plan / section shares one store.

## shadcn-first audit

New primitives this phase: **none from the registry**. `checkbox`, `badge`,
`textarea`, `button`, `card` (already installed) compose the step card; the
section grid reuses the Phase-1 `SectionTile`/`StepCard`. The expandable card and
trust footer are thin custom compositions of those primitives (no registry
equivalent for this domain layout). Documented per the shadcn-first rule.

## Verification

| Check | Command | Result |
|---|---|---|
| Typecheck | `pnpm typecheck` | ✅ |
| Lint/format | `pnpm lint` | ✅ (107 files) |
| Unit + coverage | `pnpm test:coverage` | ✅ 162 tests; all-files 93.9% stmts / 86.5% branches (engine still 100%) |
| e2e + axe (both themes, mobile + desktop) | `pnpm e2e` | ✅ 18 tests — quiz → home → section → check → reload persists → My plan in sync → "outdated?" thank-you; axe clean |
| "Outdated?" writes a row | server action → local Supabase | ✅ row present (`reason=outdated`, comment captured) |
| Import from scratch | `db reset` → `content:import --dir ../olim-content/content` | ✅ 8 sections / 46 steps / 4 benefits |
| Lighthouse (mobile) | `pnpm lighthouse` | ✅ perf 0.92–0.96, a11y 1.0 on `/`, `/guides`, `/guides/[section]`, `/onboarding`, `/dev/ui` |
| Build | `pnpm build` | ✅ 8 routes |

Screenshots (Pixel-7, both themes) in `docs/PHASE_REPORTS/assets/phase-4/`:

| | Light | Dark |
|---|---|---|
| Home | ![](assets/phase-4/home-light.png) | ![](assets/phase-4/home-dark.png) |
| Section | ![](assets/phase-4/section-light.png) | ![](assets/phase-4/section-dark.png) |

## Deferred / debts

1. **JS first load grew to ~245–270KB** on the interactive screens (client
   profile+zod validation, plan engine, next-intl messages, Radix). Hard gates
   (perf ≥90 / a11y ≥95) pass with margin; the Lighthouse JS guard is now a single
   coarse regression catch at 280KB. Trimming — per-route next-intl message
   splitting, lazy zod, RSC-only sub-trees — is a tracked debt (also the 170KB
   ROADMAP target from phase-1).
2. **Home / Guides / Plan are statically prerendered** with content baked at build
   (anon read at build time); content changes need a redeploy. Fine now; revisit
   with ISR/`revalidate` or on-demand revalidation when content updates get
   frequent. `/guides/[section]` is dynamic (per-request).
3. **Remote still unseeded** — the shared Supabase `public` has no content yet
   (Phase 2 neighbor-backup ritual still required before the first push). Until
   then, the Vercel preview renders the committed fixtures via the fallback (so
   the phone test shows the 5 fixture steps, not the full 46). Seeding the remote
   is the gate to a full-content preview.
4. **PostHog + Sentry are wired but unverified** — no keys in this session. Create
   free projects and add `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_SENTRY_DSN`
   (+ `NEXT_PUBLIC_POSTHOG_HOST`) to Vercel to enable; both stay silent until then.
   Sentry is a minimal env-gated client init; full server instrumentation / source
   maps are deferred.
5. Unit coverage excludes the route-level view components (e2e-covered); a `0`
   count on an empty personalized section tile is shown rather than hidden.

## Verification commands

```
pnpm db:start && pnpm content:import --dir ../olim-content/content
pnpm typecheck && pnpm lint
pnpm test:coverage
pnpm e2e            # home/section flow + axe, both themes, mobile + desktop
pnpm lighthouse
```

## For the reviewer

Set a profile by running the quiz, then open Home on a phone via the Vercel
preview. Note: until the remote is seeded (debt #3) the preview shows the fixture
subset; the full content is visible locally after `content:import`.
