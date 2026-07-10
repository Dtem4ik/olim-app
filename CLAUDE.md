# CLAUDE.md — Olim App

**Read `AGENTS.md` first — it is the canonical instruction file for all AI agents in this repo.** Everything below is Claude-specific addenda only.

## Claude session workflow

1. Read `AGENTS.md`, then `docs/ROADMAP.md`, then the latest `docs/PHASE_REPORTS/phase-{N-1}.md`.
2. Work strictly within your assigned phase (your kickoff prompt names it). Future-phase work is forbidden even when convenient.
3. Chat with the user in Russian; everything committed to the repo is English.
4. Commit atomically with Conventional Commits as you go — not one giant commit at the end.
5. Finish by writing `docs/PHASE_REPORTS/phase-{N}.md` (done / deferred+why / debts / verification commands / screenshots) and updating the Commands section in `AGENTS.md` if scripts changed.

## Verification before claiming done

Run and show the results of: lint, typecheck, unit tests, e2e smoke, and a Lighthouse check on key pages. A phase report without verification output is incomplete.
