# AGENTS.md — guide for AI agents working on Olim App

This is the canonical instruction file for all AI coding agents (Claude Code, Cursor, Codex, etc.). Tool-specific files (`CLAUDE.md`) point here. If instructions ever conflict, this file wins.

## What this project is

Olim App — an adaptation navigator for new immigrants (olim) in Israel. Personalized home screen, practical guides (banks, rent, healthcare, work, benefits, Hebrew), a trackable plan with deadline warnings, search (AI-powered in Phase 8). RU/EN, light/dark, PWA first, app stores via Capacitor (Phase 9).

Stack: Next.js (App Router, TS strict) on Vercel · Supabase (Postgres, Auth, pgvector) · Tailwind + shadcn/ui · Lucide · next-intl. FastAPI only where the roadmap explicitly says so.

## Project map

| Path | Purpose |
|---|---|
| `docs/ROADMAP.md` | The 10-phase plan with DoD and acceptance checklists. Read first. |
| `docs/PHASE_REPORTS/` | One report per completed phase. Read the latest before working. |
| `docs/ARCHITECTURE.md` | System design (created in Phase 1, keep updated). |
| `docs/CONTENT_SCHEMA.md` | Content data format (created in Phase 2). |
| `CONTRIBUTING.md` | Phase workflow, local setup, content flow, commit/PR conventions. |
| `docs/reference/*.ru.md` | Product research in Russian — domain knowledge donor, not code docs. |
| `docs/PROMPTS/PHASE_{N}_PROMPT.md` | Kickoff prompt per phase. |

## Hard rules

1. **Phase scope is law.** You work only within your assigned phase (see your kickoff prompt). Never implement future-phase features "while you're at it".
2. **Language policy.** Repository content — code, comments, commits, PRs, docs, reports, branches — is English. Chat with the user is Russian. User-facing strings live in next-intl dictionaries only (never hardcoded in JSX).
3. **Content is data.** Guide texts belong in Supabase/JSON per `docs/CONTENT_SCHEMA.md`, never in components. Every content step carries `source_url` and `last_verified_at`.
4. **No hardcoded colors** in components — semantic CSS-variable tokens only (light/dark themes must both work).
5. **Finish protocol.** Every session ends by writing `docs/PHASE_REPORTS/phase-{N}.md`: done / deferred+why / known debts / verification commands / screenshots or preview links. Update the Commands section below if scripts changed.
   **Docs are part of DoD:** before finishing, sweep the living docs — README (Status section + anything user-visible that changed), `docs/ARCHITECTURE.md`, `CONTRIBUTING.md`, and this file. Stale docs mislead every future agent session and human contributor; a phase with outdated docs is not done.
6. **Shared Supabase project.** The Supabase project is shared: olim-app owns the `public` schema; the `portfolio` schema belongs to the production portfolio site (dtem4ik.dev) — never touch it, its grants, or Exposed schemas. Migrations are additive and `public`-scoped; destructive commands against the linked remote (e.g. `supabase db reset --linked`) are forbidden. Local dev-stack resets are fine.
7. **Neighbor backup ritual.** Before pushing ANY migration to the linked remote: take a fresh `pg_dump -n portfolio` snapshot (keep locally, never commit), state in the phase report that it was taken, and list exactly which objects the migration touches. No snapshot — no push.

## Quality bar (CI-enforced)

- TypeScript strict, `noUncheckedIndexedAccess`, no `any`.
- Biome lint/format clean; lefthook hooks pass; Conventional Commits.
- Vitest: `lib/` coverage ≥80%, condition engine 100%. Playwright e2e smoke per phase + axe (0 critical/serious, both themes).
- Lighthouse mobile (hard gates, every route): Performance ≥90, A11y ≥95 (both
  pass with margin). JS first load is a coarse regression guard at ≤280KB — Phase
  4's interactive app screens (client profile+zod, plan engine, next-intl
  messages, Radix) sit ~245–270KB over the Next 16 + React 19 client floor
  (~180KB). The 170KB ROADMAP target + per-route trimming are tracked debts; see
  `docs/PHASE_REPORTS/phase-1.md`, `phase-4.md` and `lighthouserc.cjs`.
- A11y: tap targets ≥44px, body text ≥14px, focus states, ARIA.
- Security: RLS on user-data tables; share slugs nanoid ≥12.

## Known traps (don't re-derive these — they cost days once)

- **Local macOS-arm64 prod build mis-renders `<a>`/`<button>` colours.** In
  `pnpm build && pnpm start` on Apple Silicon, the Tailwind oxide + Next CSS
  minifier drops the `@layer theme, base, components, utilities;` order
  declaration (only `@layer components;` survives), so buttons/links fall back to
  user-agent colours — grey buttons, periwinkle (`#9e9eff`) links in dark mode.
  **This is local-only.** `pnpm dev` (turbopack), CI (Linux), and the Vercel
  deploy all render correctly. Adding the `@layer` declaration to `globals.css`
  does NOT help (the minifier strips it locally too). So: use `pnpm dev` for any
  visual / dark-mode check, and **trust CI, not local `pnpm e2e`**, for axe in
  dark mode — local e2e boots that same broken prod build and will throw false
  `#9e9eff` contrast failures. Don't chase these; they are not real.
- **The entrance fade fights the audits — the fix is already in, don't "re-fix"
  the tokens.** `@keyframes page-enter` starts at `opacity: 0.01`, not `0`, on
  purpose: a backgrounded Lighthouse audit freezes the animation on its first
  frame, and a literal `0` scores as NO_FCP. Separately, axe samples colours
  mid-fade where muted text is semi-transparent and blends lighter — a *false*
  contrast fail. The real fix is `tests/e2e/settle.ts` (`settleAnimations`,
  called in every axe helper before `analyze()`), which kills animations so axe
  reads settled colours. `--muted-foreground: oklch(0.52 …)` already clears AA
  (~5.4:1) at full opacity — do NOT darken it to "fix contrast"; that only
  chases the mid-fade artifact.

## Conventions

- Branches: `phase-N/short-description`. PRs into `main`, green CI required.
- Commits: atomic, `feat:` / `fix:` / `chore:` / `docs:` / `test:` / `refactor:`.
- Components in `components/`, pure logic in `lib/` (tested), route handlers thin.
- Prefer boring solutions; no new dependencies without a reason stated in the PR description.
- If you find a mistake in docs — fix the doc in the same PR, don't work around it silently.

## UI policy: shadcn-first

- **Before writing ANY component, check whether shadcn/ui already provides it** (or a composable primitive for it). Use the shadcn MCP server to search the registry; do not guess from memory — the registry is large (dialogs, sheets, command palette, form, combobox, skeleton, toast/sonner, tabs, accordion, etc.).
- Custom components are allowed only when nothing in the registry fits, and they must compose shadcn primitives rather than reimplement them. State in the PR description which registry components you checked and why they didn't fit.
- Adapt installed primitives to our semantic tokens and the ≥44px tap-target rule — don't fork their internals beyond that.
- Use the Context7 MCP server to pull up-to-date docs for libraries (Next.js, Supabase, Tailwind, next-intl, Capacitor) instead of relying on training memory — APIs move fast.

## MCP setup (one-time, config committed to repo)

If `.mcp.json` with the shadcn server is not present in the repo yet, run:

```
pnpm dlx shadcn@latest mcp init --client claude
```

Commit the resulting config so every future session gets the shadcn MCP automatically. Add Context7 MCP alongside if not configured.

## Commands

Populated in Phase 1. Keep current:

```
pnpm dev             # start the dev server (Turbopack; SW disabled in dev)
pnpm build           # production build (next build --webpack — serwist needs webpack)
pnpm start           # serve the production build
pnpm icons           # regenerate the PWA icon set (public/icons) from the SVG glyph
pnpm lint            # Biome lint + format check
pnpm lint:fix        # Biome autofix (format + safe fixes)
pnpm typecheck       # tsc --noEmit
pnpm test            # Vitest unit run
pnpm test:coverage   # Vitest with v8 coverage
pnpm e2e             # Playwright smoke + axe (both themes); builds first locally
pnpm e2e:install     # install the Playwright chromium browser
pnpm lighthouse      # Lighthouse CI (perf ≥90, a11y ≥95)
pnpm db:start        # start the local Supabase stack (needs Docker running)
pnpm db:stop         # stop the local Supabase stack
pnpm db:reset        # recreate the local DB and re-apply migrations (LOCAL only)
pnpm db:types        # regenerate lib/supabase/database.types.ts from the local DB
pnpm content:validate      # schema + integrity + editorial lint (CI gate)
pnpm content:import        # validate, then idempotent upsert → LOCAL stack by default
pnpm content:check-links   # fetch every source_url; report only, never fails
pnpm content:review-queue  # list steps still needs_review = true
```

Content format, the `cond`/`warn_rule` languages, and the source allowlist are
documented in `docs/CONTENT_SCHEMA.md`. Real content lives in the private
`olim-content` repo (clone as a sibling `../olim-content`); the committed
`content/fixtures/` set powers tests and local dev. `content:import` and
`content:review-queue` default to the LOCAL stack and refuse a non-local target
unless `--allow-remote` is passed (shared DB — rules 6 & 7). After a successful
import, `content:import` pings the deployed site's on-demand revalidation endpoint
(`POST /api/revalidate`) so new content goes live without a redeploy (Phase 6b) — a
no-op unless both `SITE_REVALIDATE_URL` and `REVALIDATE_SECRET` are set.

Node ≥20.11, pnpm 10. Git hooks are installed automatically via `pnpm install`
(lefthook). First-time e2e needs `pnpm e2e:install`.

**Local Supabase.** Needs Docker running and the `supabase` CLI on PATH
(`brew install supabase/tap/supabase`, or the release binary — keep `supabase`
and `supabase-go` co-located). `pnpm db:start` prints local URLs/keys (or
`supabase status`). Migrations live in `supabase/migrations/` and apply on
`db:start` / `db:reset`. NEVER run `supabase db reset --linked` or any
destructive command against the shared remote (AGENTS.md rules 6 & 7).

## Domain crib sheet (so you don't have to guess)

- *Oleh / olim* — new immigrant(s) to Israel; *aliyah* — the immigration itself.
- *Teudat oleh* — immigrant ID issued at the airport; *teudat zehut* — Israeli ID card.
- *Sal klita* — "absorption basket", monthly payments to new olim (first 6 months).
- *Kupat holim* — health fund (HMO); registration is an early must-do step.
- *Ulpan* — free state Hebrew course; *arnona* — municipal tax (olim get a discount).
- Key official sources: gov.il (Ministry of Aliyah and Integration), Kol Zchut (kolzchut.org.il — state rights encyclopedia, has Russian), Nativ (consular checks for FSU countries), Bituach Leumi (national insurance).
- Sensitive: this is bureaucratic/legal-adjacent info. The product never guarantees outcomes, always links the official source, and shows `last_verified_at`. The AI search (Phase 8) must never answer beyond retrieved content.
