# Phase 3 kickoff prompt

Preconditions: Phase 2 merged into `main` (green CI); `olim-content` pushed to its private remote; the user has started editorial review (not blocking).

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 3 of the Olim App project. Read `AGENTS.md` (canonical rules — note shadcn-first UI policy, the shared-Supabase rules, and the finish protocol), `docs/ROADMAP.md` (Phase 3 scope: 3a → 3b), `docs/PHASE_REPORTS/phase-2.md`, and `docs/CONTENT_SCHEMA.md`. Work STRICTLY within Phase 3. No home screen, no section pages, no analytics wiring — that is Phase 4. No accounts — Phase 7.

Language policy: repository is English; chat with the user in Russian; all user-facing strings via next-intl dictionaries (RU now, EN keys ready).

## 3a — Onboarding quiz

- Flow at `/onboarding`: 5–7 questions — stage (preparing / just landed / first months / settled), basis (use `basisSchema` from `lib/content/schema.ts` — including child_of_jew vs grandchild_of_jew), country of origin, family composition (+ children ages when relevant), pet, city (free text or short list), months in country when stage requires it. Conditional questions (children ages only if with_children; months only if in country).
- One question per screen, progress indicator, back navigation, mobile-first, both themes. Use shadcn primitives via the MCP registry check (RadioGroup / Field / Button etc.) — document what you checked per the shadcn-first rule.
- Answers are validated by the SAME zod vocabularies from `lib/content/schema.ts` — no parallel enums. Store the profile in localStorage (versioned key, e.g. `olim.profile.v1`); allow re-taking the quiz later ("edit answers" entry point exists but can live on the quiz start screen for now).
- i18n: all questions/options in the RU dictionary with EN keys ready.

## 3b — Condition engine

- Pure function in `lib/plan/`: `buildPlan(answers, steps) → PersonalPlan` — filters steps by `cond` (every key of the condition language from CONTENT_SCHEMA.md: stage, basis, country, family, children_ages ranges, pet, months_in_country ranges), sorts by stage then `sort_order`, and computes warnings from `warn_rule` + relevant user dates (flight date / arrival date from the profile where applicable).
- **100% test coverage on the engine** — this is the product core. Include: every cond key alone and in combination, missing/empty cond (step applies to everyone), boundary values of ranges, every warn_rule type with date math edge cases (today, past deadline, far future).
- Snapshot tests for 6 reference personas (define them in a fixture: e.g. single preparing from RU; family with kids just landed from KZ; grandchild_of_jew preparing; spouse settled 8 months; single_parent with pet just landed; returning_citizen first months) — assert plan size and the set of unique step slugs per persona, and that plans differ meaningfully.
- Data source for the quiz result page in THIS phase: local fixtures via the existing content loader (real Supabase wiring of screens is Phase 4). A minimal "plan preview" list after finishing the quiz is allowed (plain list of step titles grouped by stage) purely to prove the engine end-to-end — do not build the real Home/Plan UI.

## DoD

- e2e: complete the quiz on mobile viewport → plan preview renders → reload → profile persists → change answers → preview changes. axe clean (both themes) on all quiz screens.
- Engine: 100% coverage, snapshot table for 6 personas committed in the report ("answers → plan size → unique steps").
- Lighthouse budgets hold; all CI jobs green.

Finish: `docs/PHASE_REPORTS/phase-3.md` (English) — done / deferred / debts / verification commands / persona table / what shadcn registry components were used vs custom and why. Update `docs/ARCHITECTURE.md` (personalization section) and Commands in `AGENTS.md` if scripts changed.
