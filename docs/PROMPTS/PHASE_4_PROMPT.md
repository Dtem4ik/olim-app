# Phase 4 kickoff prompt

Preconditions: Phase 3 merged into `main` (green CI); local Supabase stack available (`pnpm db:start` + `pnpm content:import`).

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 4 of the Olim App project. Read `AGENTS.md`, `docs/ROADMAP.md` (Phase 4 scope: 4a → 4b), `docs/PHASE_REPORTS/phase-3.md`, `docs/CONTENT_SCHEMA.md`, and `docs/ARCHITECTURE.md`. Work STRICTLY within Phase 4. No full plan tracker/sharing/PWA (Phase 5), no search (Phase 6), no accounts (Phase 7).

Language policy: repository is English; chat in Russian; all user-facing strings via next-intl dictionaries.

## Housekeeping (first commit, small)

- Move the untracked `PHASE_*_PROMPT.md` files into `docs/PROMPTS/` and commit them (project history, no secrets).
- Fix the stale budget line in `AGENTS.md` ("JS first load <170KB") to reflect the actual per-route CI guard (onboarding ≤256KB, content pages ≤200KB; Performance ≥90 / A11y ≥95 unchanged).
- Add the minimal CI workflow to the private `olim-content` repo (checkout `olim-app` alongside + run `pnpm content:validate --dir`), as recorded in Phase 2 debts. Ask the user to grant repo access if pushing there is not possible from this session — otherwise prepare the workflow file and instructions.

## 4a — Home: "your situation"

- `/` becomes the personalized home (when a profile exists in localStorage; otherwise it invites to the quiz): contextual greeting (stage, months in country, city when known), a "burning deadlines" block (from `buildPlan` warnings: overdue/today/soon first), "next 3 steps" (first unchecked entries of the personal plan), and the sections grid (SectionTile with per-section step counts from the personal plan).
- Data source: server components read sections/steps from local Supabase (anon key, RLS public read). The personal plan is computed client-side via the existing `buildPlan` from the profile. Done-state: localStorage for now (`olim.progress.v1`, versioned; DB-backed plans arrive in Phase 5 — structure the storage module so the backend can be swapped).
- Wire `BottomNav` for real: Home / My plan (the Phase 3 preview page, relabeled) / Guides (sections index) / Profile (view + edit quiz answers, theme toggle, language placeholder).
- **Analytics + errors:** PostHog (events: `quiz_completed` retrofit, `step_done`, `section_opened`, `report_outdated`) and Sentry — both env-gated: silently disabled when env keys are absent (local/CI), enabled in prod. Ask the user to create free PostHog + Sentry projects and add the env vars to Vercel.

## 4b — Section screen and step card

- `/guides` (sections index) and `/guides/[section]`: section intro, its steps from the personal plan when profile exists (else all steps), each a StepCard → step detail (route or expandable card — pick the better mobile UX and justify): short answer first, "bring with you" (docs list), checkable steps state, community tip block, deadline badge when applicable, then trust footer: visible `last_verified_at`, "Official source" link, and "Информация устарела?" button.
- The "outdated?" button actually works: anon insert into `step_reports` (RLS insert-only, already in place) with step id + optional free-text reason; thank-you state; PostHog event.
- Checking a step here and on Home/My plan must share the same progress store.

## DoD

- e2e (mobile viewport): quiz → home shows greeting + deadlines + next steps → open section → check a step → reload → state persists everywhere → "outdated?" writes a row (assert via local Supabase). axe clean, both themes, all new screens.
- Lighthouse: per-route budgets hold on `/`, `/guides`, `/guides/[section]`.
- All strings in dictionaries; shadcn-first documented for any new component.

Finish: `docs/PHASE_REPORTS/phase-4.md` (English) — done / deferred / debts / verification commands / screenshots (home, section, step card — both themes) / shadcn audit. Update `docs/ARCHITECTURE.md` (screens + analytics) and Commands in `AGENTS.md` if changed.
