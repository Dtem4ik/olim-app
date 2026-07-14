# Olim App

Adaptation navigator for new immigrants (olim) in Israel. Personalized home screen, practical guides (banks, rent, healthcare, work, benefits, Hebrew), a trackable plan with deadline warnings, and search — RU/EN, light/dark, PWA first, app stores via Capacitor later.

## Status

Phases 1–4 are in `main`:

- **Phase 1** — repository foundation, design tokens/themes, UI kit v1.
- **Phase 2** — Supabase data model + content pipeline (validator, seed script).
- **Phase 3** — onboarding quiz + the pure condition engine (`buildPlan`, 100% covered).
- **Phase 4** — personalized home, guides, section & step cards, progress store.

Phase 5 (in progress) adds the full plan tracker, plan sharing (`/plan/{slug}` +
OG unfurl), and PWA/offline. See `docs/PHASE_REPORTS/` for per-phase reports and
`docs/ROADMAP.md` for the full 10-phase plan.

## Quick start

```
pnpm install     # installs deps + git hooks (lefthook)
pnpm dev         # http://localhost:3000
```

Without a database the app renders the committed content **fixtures**, so the home,
guides, quiz and plan all work out of the box. `/dev/ui` shows the component kit.
Full command list in `AGENTS.md`.

### Data layer

The app uses Supabase. For local development against real content:

1. Install the `supabase` CLI and start Docker.
2. `pnpm db:start` — boots the local stack and applies migrations. `pnpm db:reset`
   re-applies from scratch; `supabase status` prints local URLs/keys.
3. `pnpm content:import` — seeds the local DB from the committed `content/fixtures/`
   (add `--dir ../olim-content/content` to seed the full private content set).

Real content lives in the **private `olim-content` repo**; clone it as a sibling
directory (`../olim-content`). Content format is documented in
`docs/CONTENT_SCHEMA.md`. The Supabase project is **shared** with the portfolio
site — migrations are additive and `public`-scoped, and destructive commands
against the linked remote are forbidden (see `AGENTS.md` rules 6 & 7).

See `CONTRIBUTING.md` for the phase workflow, local setup, and content-contribution
flow.

## How this project is built

Development runs in phases, each executed by a separate Claude Code session and reviewed by a team-lead session. See:

- `AGENTS.md` — canonical instruction file for all AI agents (read first)
- `docs/ROADMAP.md` — full 10-phase plan, engineering standards, acceptance checklists
- `CLAUDE.md` — Claude-specific session addenda
- `CONTRIBUTING.md` — phase workflow, local setup, commit/PR & content conventions
- `docs/PROMPTS/` — kickoff prompt per phase
- `docs/PHASE_REPORTS/` — one report per completed phase
- `docs/reference/` — product research and planning documents (Russian)

## Getting started (new phase session)

1. Open this folder in a new Claude Code session.
2. Paste the kickoff prompt for the current phase from `docs/PROMPTS/`.
3. When the session finishes, take `docs/PHASE_REPORTS/phase-{N}.md` to the
   team-lead session for review and the next phase prompt.
