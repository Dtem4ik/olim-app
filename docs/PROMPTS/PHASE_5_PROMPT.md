# Phase 5 kickoff prompt

Preconditions: Phase 4 merged into `main` (green CI). `../olim-content` cloned locally. (PostHog/Sentry keys are deliberately deferred until Phase 10 launch — the analytics code stays env-gated and silent; do not ask the user for these keys.)

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 5 of the Olim App project. Read `AGENTS.md` (note hard rules 6–7: shared Supabase, neighbor backup ritual), `docs/ROADMAP.md` (Phase 5 scope: 5a → 5b → 5c), `docs/PHASE_REPORTS/phase-4.md`, and `docs/ARCHITECTURE.md`. Work STRICTLY within Phase 5. No search/SEO (Phase 6), no accounts (Phase 7).

Language policy: repository is English; chat in Russian; user-facing strings via next-intl dictionaries.

## Housekeeping — docs sweep (small, early commit)

- README is stale (Status still says "Phase 1 complete"): rewrite the Status section to reflect the actual state (Phases 1–4 in main: foundation, data layer + content pipeline, quiz + condition engine, personalized home + guides), and make Quick start current.
- Create `CONTRIBUTING.md`: how the phase workflow operates (kickoff prompts in `docs/PROMPTS/`, phase reports, team-lead review), how to run the project locally (db:start, content:import, dev, tests), how content contributions flow (olim-content repo, validator, review queue), commit/PR conventions.
- Note the new AGENTS.md hard-rule addition: docs sweep is now part of every phase's DoD — README Status, ARCHITECTURE, CONTRIBUTING, AGENTS must be current before a phase is reported done. This applies to THIS phase too (PWA/share/tracker must land in README + ARCHITECTURE by the end).

## Step 0 — first remote push + seed (the gate everything else waits on)

This is the FIRST time the shared remote is touched. Follow the ritual exactly:

1. `pg_dump -n portfolio` snapshot from the remote (local only, never commit). State in the report it was taken.
2. Inspect the remote `public` schema BEFORE pushing: list existing tables (the portfolio's old snapshot-cache tables may live there). If ANY table exists in remote `public`, STOP and report to the user with the list — do not drop anything.
3. Verify `SHOW server_version;` matches `major_version` in `config.toml`.
4. `supabase link` + push migrations (additive, `public` only). List every object the migration creates in the report.
5. Seed content: `pnpm content:import --dir ../olim-content/content --allow-remote`. Verify counts (8 sections / 46+ steps / 4 benefits) via REST with the anon key.
6. Check the Vercel prod deployment now serves real content (home + guides on the preview/prod URL).

## 5a — Plan tracker

- "Мой план" becomes the full tracker: all matched steps grouped by stage, progress bar, filters (all / burning / done), works off the shared progress store from Phase 4.
- Home polish from Phase 4 review: zero-count sections in the grid are de-emphasized or hidden (pick and justify).
- Hardening from the Phase 4 code review: in `reportOutdated`, clamp/validate `comment` server-side (length cap, zod) and add a lightweight rate limit (per-IP or per-session, simple in-memory/upstash-free approach is fine); verify `step_reports.comment` has a DB-level length CHECK — add one in an additive migration if missing. Apply the same length/rate discipline to the new `plans` insert action in 5b.

## 5b — Sharing

- "Поделиться планом" → server action inserts an anonymous row into `plans` (share_slug nanoid ≥12, answers snapshot, done_step_ids snapshot) → `/plan/{slug}` read-only page (via the existing `get_plan_by_share_slug` RPC): stage-grouped steps with done-marks, progress, and a CTA "Собери свой план" → onboarding.
- OG image for `/plan/{slug}` (dynamic, e.g. next/og): progress + stage summary — this is the viral unfurl for Telegram/WhatsApp. Verify the unfurl with a real Telegram post to yourself.
- Native share via Web Share API on mobile, clipboard fallback on desktop. PostHog event `plan_shared`.
- Privacy: the share page must not expose city or any free-text fields — only stage-level info and step titles.

## 5c — PWA

- Manifest (name, icons — generate a simple monochrome glyph set), theme colors for both modes.
- Service worker (serwist): precache the app shell; runtime-cache viewed guides and the personal plan so "Мой план" and previously opened steps open OFFLINE (airplane-mode scenario: person at the airport). Offline fallback page for everything else.
- Careful with SW + Vercel deploys: versioned SW with clean update flow (no stale-forever caches); document the update strategy in ARCHITECTURE.

## DoD

- e2e: tracker filters work; share flow creates a row and `/plan/{slug}` renders read-only (assert via local Supabase); axe clean both themes on new screens.
- Manual (user-assisted): Telegram unfurl screenshot; airplane-mode test on a real phone — plan opens offline.
- Lighthouse budgets hold (incl. the new `/plan/[slug]`); PWA installability passes (Lighthouse PWA or manual A2HS check).
- PostHog/Sentry: keep emitting events through the env-gated facade (`plan_shared` added), but do NOT verify dashboards — keys are deferred to Phase 10 by decision.

Finish: `docs/PHASE_REPORTS/phase-5.md` (English) — done / deferred / debts / verification commands / remote-push ritual evidence / screenshots (tracker, share page, OG unfurl, offline) / shadcn audit. Update `docs/ARCHITECTURE.md` (sharing + PWA sections) and Commands in `AGENTS.md` if changed.
