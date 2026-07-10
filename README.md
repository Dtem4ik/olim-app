# Olim App

Adaptation navigator for new immigrants (olim) in Israel. Personalized home screen, practical guides (banks, rent, healthcare, work, benefits, Hebrew), a trackable plan with deadline warnings, and search — RU/EN, light/dark, PWA first, app stores via Capacitor later.

## Status

Phase 1 complete — repository foundation, design tokens/themes, and UI kit v1 are
in place (`docs/PHASE_REPORTS/phase-1.md`). Next: Phase 2 (data model & content).

Quick start: `pnpm install`, then `pnpm dev` and open `/dev/ui` for the component
kit. Full command list in `AGENTS.md`.

## How this project is built

Development runs in phases, each executed by a separate Claude Code session and reviewed by a team-lead session. See:

- `docs/ROADMAP.md` — full 10-phase plan, engineering standards, acceptance checklists
- `CLAUDE.md` — instructions for every working session
- `PHASE_1_PROMPT.md` — kickoff prompt for the first session (start here)
- `docs/PHASE_REPORTS/` — one report per completed phase
- `docs/reference/` — product research and planning documents (Russian)

## Getting started

1. Open this folder in a new Claude Code session.
2. Paste the prompt from `PHASE_1_PROMPT.md`.
3. When the session finishes, take `docs/PHASE_REPORTS/phase-1.md` to the team-lead session for review and the Phase 2 prompt.
