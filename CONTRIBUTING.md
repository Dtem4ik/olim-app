# Contributing to Olim App

This project is built by AI coding sessions under human review. Whether you are an
AI agent or a human contributor, the rules are the same. **Read `AGENTS.md` first —
it is the canonical instruction file and wins over anything here if they conflict.**

## The phase workflow

Development runs as ten sequential phases (`docs/ROADMAP.md`). Each phase is one
working session:

1. **Kickoff.** A session receives the phase prompt from `docs/PROMPTS/PHASE_{N}_PROMPT.md`,
   repo access, and the previous phase report.
2. **Execute — strictly in scope.** A session implements only its assigned phase.
   Future-phase work is forbidden even when convenient (scope creep is the #1
   project killer). Commit atomically as you go — not one giant commit at the end.
3. **Finish.** The session writes `docs/PHASE_REPORTS/phase-{N}.md` (done /
   deferred+why / known debts / verification commands / screenshots) and sweeps the
   living docs (see "Docs are part of Done" below).
4. **Review.** A human takes the report to a team-lead session, which checks it
   against the phase acceptance checklist and issues the next phase prompt.

## Running the project locally

```
pnpm install                 # deps + git hooks (lefthook)
pnpm dev                     # http://localhost:3000
```

The app falls back to committed content **fixtures** when no database is
configured, so most screens work with just `pnpm dev`. For real content and the
data layer:

```
pnpm db:start                # local Supabase stack (needs Docker running)
pnpm content:import          # seed the local DB from content/fixtures/
#   add --dir ../olim-content/content to seed the full private content set
```

Full command list (tests, lint, lighthouse, content tools) lives in `AGENTS.md`.

### Environment files (local-first)

Copy `.env.example` → `.env.local` and fill it in. The env layout is **local-first**
so day-to-day dev never touches the shared prod remote (Next.js loads
`.env.$(NODE_ENV).local` over `.env.local`):

| File | Points at | Used by |
|---|---|---|
| `.env.development.local` | local stack (`127.0.0.1:54321`) | `pnpm dev` |
| `.env.production.local` | local stack too | local `pnpm build && pnpm start` |
| `.env.local` | the **shared prod remote** + real secrets | prod-facing tooling; base when no `*.local` override applies |

All three are gitignored; Vercel has none of them (it uses its own project env), so
the split never affects deploys. For local dev use the keys `supabase start` prints.
Explicit prod-facing work (e.g. a migration push per the ritual below) reads
`.env.local`.

### Verify before claiming done

Every phase must show output for: `pnpm lint`, `pnpm typecheck`,
`pnpm test:coverage`, `pnpm e2e` (Playwright + axe, both themes), and
`pnpm lighthouse` on the key routes. A phase report without verification output is
incomplete.

## Content contributions

Guide content is **data, not code** — it never lives in components.

- Real content lives in the private **`olim-content`** repo, cloned as a sibling
  directory (`../olim-content`). A committed subset in `content/fixtures/` powers
  tests and local dev.
- Content is authored as JSON bundles per `docs/CONTENT_SCHEMA.md`. Every step
  carries a trusted `source_url` and a `last_verified_at` date.
- `pnpm content:validate` is the CI gate (schema + integrity + editorial lint:
  trusted-source allowlist, banned phrases, freshness). `olim-content` runs it in
  its own CI against this repo's validator.
- `pnpm content:import` upserts idempotently into the **local** stack by default
  and refuses a remote target without `--allow-remote` (the remote is shared — see
  below).
- New or edited steps land with `needs_review = true`; `pnpm content:review-queue`
  lists what still needs an editor pass.

## Shared database — handle with care

The Supabase project is **shared** with the production portfolio site
(dtem4ik.dev). Olim App owns the `public` schema only; the `portfolio` schema is
off-limits (AGENTS.md rules 6 & 7). Therefore:

- Migrations are **additive** and `public`-scoped. Live in `supabase/migrations/`.
- Destructive commands against the linked remote (`supabase db reset --linked`,
  drops) are **forbidden**. Local dev-stack resets are fine.
- Before pushing ANY migration to the remote: take a fresh `pg_dump -n portfolio`
  snapshot (keep locally, never commit), state in the phase report that it was
  taken, and list exactly which objects the migration touches. **No snapshot — no
  push.**

## Commit & PR conventions

- **Conventional Commits:** `feat:` / `fix:` / `chore:` / `docs:` / `test:` /
  `refactor:`. Atomic commits, present-tense subject.
- Branches: `phase-N/short-description`. PRs into `main`; green CI is required.
- The repository is **English** — code, comments, commits, PRs, docs, reports,
  branch names. Chat with the user is Russian. User-facing strings go through
  next-intl dictionaries (`messages/*.json`), never hardcoded in JSX.
- **UI is shadcn-first:** check the shadcn registry (via the MCP server) before
  writing any component; custom components compose primitives, never reimplement
  them. State in the PR which registry items you checked.
- No hardcoded colors — semantic CSS-variable tokens only (both themes must work).
- No new dependencies without a reason stated in the PR description.
- Found a mistake in the docs? Fix the doc in the same PR — don't work around it
  silently.

## Quality bar (CI-enforced)

- TypeScript strict, `noUncheckedIndexedAccess`, no `any`.
- Biome lint/format clean; lefthook hooks pass; Conventional Commits.
- Vitest: `lib/` coverage ≥80%, condition engine 100%. Playwright e2e + axe
  (0 critical/serious, both themes).
- Lighthouse mobile (every route): Performance ≥90, A11y ≥95; JS first-load
  regression guard (see `lighthouserc.cjs`).
- A11y: tap targets ≥44px, body text ≥14px, focus states, ARIA.

## Docs are part of Done

Before a phase is reported done, sweep the living docs so the next session and any
human start from the truth: **README** (Status + anything user-visible that
changed), **`docs/ARCHITECTURE.md`**, **this file**, and **`AGENTS.md`** (Commands
section if scripts changed). Stale docs mislead every future contributor — a phase
with outdated docs is not done.
