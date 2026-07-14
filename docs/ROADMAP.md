# Olim App — Roadmap

Adaptation navigator for new immigrants (olim) in Israel. A person answers a short quiz about their situation and gets a personalized home screen, guides (banks, rent, healthcare, work, benefits, Hebrew…), a trackable plan with deadlines, and search (AI-powered later). RU/EN, light/dark themes, PWA first, app stores via Capacitor later.

Stack: Next.js (App Router, TS strict) on Vercel · Supabase (Postgres, Auth, pgvector) · Tailwind + shadcn/ui · Lucide icons · FastAPI only where explicitly stated.

Russian reference documents (product research, personas, content sources): `docs/reference/aliyah-research.ru.md`, `docs/reference/plan.ru.md`.

---

## Multi-session execution protocol

Each phase is executed in a separate Claude Code session.

1. **Kickoff.** The phase session receives: the phase prompt, repo access, and `docs/PHASE_REPORTS/phase-{N-1}.md`.
2. **Finish.** The session MUST end by writing `docs/PHASE_REPORTS/phase-{N}.md` (English): what was done, what was deferred and why, known debts, preview links/screenshots, verification commands.
3. **Review.** The user takes the report to the team-lead session, which reviews against the phase acceptance checklist and issues the next phase prompt.
4. **Scope rule.** A session never implements anything from future phases, even when convenient. Scope creep is the #1 project killer.
5. Living repo docs: `docs/ROADMAP.md` (this file), `docs/ARCHITECTURE.md`, `docs/CONTENT_SCHEMA.md`, `CLAUDE.md` (session instructions).

## Engineering standards (apply to every phase)

- **TypeScript strict**, `noUncheckedIndexedAccess`, no `any` (CI fails).
- **Lint/format:** Biome. **Hooks:** lefthook (pre-commit: lint + typecheck on staged; commit-msg: commitlint).
- **Conventional Commits**, branches `phase-N/*`, PRs into main with green CI.
- **Tests:** Vitest (unit: all logic — condition engine, formatters, hooks; ≥80% coverage on `lib/`), Playwright (e2e smokes for each phase's key flows), Testing Library for components.
- **A11y:** eslint-plugin-jsx-a11y + axe in Playwright (0 critical/serious); focus states, ARIA, contrast in both themes; tap targets ≥44px.
- **Performance budgets (CI, Lighthouse mobile):** hard gates are the user-facing metrics — Performance ≥90, A11y ≥95, LCP <2.5s on 4G. JS first load is a ratcheted regression guard (currently ≤280KB): it may be lowered after trimming, and may only be raised by an explicit documented decision — never silently. Checked every phase, not at the end. (The original 170KB target predated measuring the ~163KB framework floor of Next 16 + React 19 and was unrealistic; trimming — message splitting, lazy zod — remains a tracked debt.)
- **i18n:** next-intl from Phase 1; no hardcoded strings in JSX — dictionaries only (RU now, EN keys ready from day one).
- **Themes:** semantic tokens (`bg-surface`, `text-primary`, …) via CSS variables; dark = `prefers-color-scheme` + manual toggle; a hardcoded color in a component is a review blocker.
- **Errors/analytics:** Sentry + PostHog events from Phase 4 (`quiz_completed`, `step_done`, `plan_shared`, `search_performed`, `report_outdated`).
- **Content = data:** step texts live in Supabase/JSON per schema, never in components. Every step carries `source_url` and `last_verified_at`.
- **Security:** RLS on all user-data tables; anonymous share slugs are unguessable (nanoid ≥12).
- **Language policy:** everything in the repository is English — code, comments, commits, PRs, docs, phase reports, branch names. Session chat with the user is Russian. User-facing product strings go through i18n dictionaries (data, not code).

---

## Phases

### Phase 1 — Repository foundation
**1a. Skeleton and tooling.** Next.js (App Router, TS strict), Tailwind, Biome, lefthook, commitlint, Vitest, Playwright, GitHub Actions (lint → typecheck → unit → build → e2e smoke → lighthouse-ci), Vercel deploy with PR previews. `CLAUDE.md` with standards and commands.
**1b. Design tokens and themes.** Light/dark palettes, semantic tokens, typography (≥14px), spacing, radii; theme toggle; font with full Cyrillic + Latin support (Inter/Golos). Token demo page.
**1c. UI kit v1.** shadcn/ui + custom: `SectionTile`, `StepCard`, `ChecklistItem`, `DeadlineBadge`, `SearchBar`, `BottomNav`, `EmptyState`. Each has a story page (`/dev/ui`), render test, axe-clean in both themes.
**DoD:** CI green, skeleton deployed, `/dev/ui` shows all components in both themes, Lighthouse ≥90/95 on the empty home page.
**Acceptance:** CI run, `/dev/ui` screenshots in both themes, conventional commit history, no hardcoded colors (grep).

### Phase 2 — Data model and content pipeline
**2a. Supabase schema.** Tables: `sections`, `steps` (title, body_md, docs jsonb, warn_rule jsonb, tips jsonb, cond jsonb, source_url, last_verified_at), `benefits` (amount tables with dates), `plans` (share_slug, answers, done_ids, nullable user_id), `step_reports`. Migrations in repo (supabase CLI), mirrored zod schemas, generated types.
**2b. Content pipeline.** Content JSON format + zod validator + seed script `pnpm content:import`; content lint: required source_url, length limits, banned phrases; broken-link report.
**2c. Content v1 — "after landing".** Sections: banks and money, rent, kupat holim/healthcare, work, olim benefits (2026 amounts in `benefits`!), transport, mobile/internet, Hebrew/ulpan. 60–90 steps. Drafts are generated by dedicated Claude content sessions from official sources (gov.il, Kol Zchut, Nativ); the human passes through as editor.
**DoD:** one command seeds the DB from scratch; content passes the validator; every entry has a source and verification date.
**Acceptance:** random sample of 10 steps checked against sources; clean import from zero.

### Phase 3 — Onboarding and personalization engine
**3a. Quiz.** 5–7 questions: stage (preparing / just landed / N months here), eligibility basis, country of origin, family composition (children ages), pet, city. Progress, "edit answers" later.
**3b. Condition engine.** Pure function `buildPlan(answers, steps) → PersonalPlan` (filter by cond jsonb, sort by stages, compute warnings from warn_rule + user dates). **100% test coverage** — this is the product core. Profile in localStorage (no accounts yet).
**DoD:** different answers produce visibly different plans (snapshot tests for 6 reference personas).
**Acceptance:** table "answers → plan size → unique steps" for 6 personas.

### Phase 4 — Home and sections
**4a. Home = "your situation".** Contextual greeting (month in country, city), "burning deadline" block, "next 3 steps", sections grid. PostHog + Sentry wired.
**4b. Section screen and step card.** Short answer on top → "bring with you" → checkable steps → community tip → "official source" + "outdated?" (writes to step_reports). Verification date visible.
**DoD:** e2e: quiz → home → section → check a step → reload → state persists. Lighthouse budgets hold.
**Acceptance:** full flow on a real phone via preview link; PostHog events verified.

### Phase 5 — My plan, sharing, PWA
**5a. Plan tracker.** All steps by stage, progress, filters (all / burning / done).
**5b. Sharing.** "Share my plan" → anonymous row in `plans` → `/plan/{slug}` (read-only, OG image with progress — the viral hook for chats). Web Share API on mobile.
**5c. PWA.** Manifest, icons, serwist: offline access to own plan and viewed steps ("at the airport with no connection" is scenario #1).
**DoD:** plan opens offline; share link unfurls nicely in Telegram (OG preview).
**Acceptance:** airplane-mode test; link posted to a real Telegram chat.

### Phase 6 — Search and SEO
**6a. Full-text search.** Postgres FTS + trigram (typos), autocomplete, search from home; empty results suggest sections.
**6b. Programmatic SEO.** Public page per step/section: metadata, sitemap, structured data (FAQ), human URLs (`/guide/banks/open-account`). Free Google traffic channel.
**DoD:** search responds <150ms; pages indexable.
**Acceptance:** 10 test queries with typos; Lighthouse SEO ≥95.

### Phase 7 — Accounts and reminders
**7a. Supabase Auth** (magic link + Google), migrate localStorage plan into account, RLS, cross-device sync.
**7b. Email deadline reminders** (Supabase Edge Functions + cron, or Resend): "your discounted driver's license exchange expires in 30 days". Notification settings.
**DoD:** e2e: anonymous plan → login → plan preserved; reminder email arrives to a test inbox.
**Acceptance:** RLS check (foreign plan inaccessible), email in inbox.

### Phase 8 — AI search (RAG)
**8a. Pipeline.** pgvector, embeddings for all steps (refresh on content change), hybrid search (FTS + vector).
**8b. Answers.** "Ask about life in Israel": answer strictly from retrieved steps, source cards under the answer; if nothing found — honest "I don't know, here are the closest sections". Streaming. Rate limiting.
**8c. Evals.** 50 reference questions → automated check "answer contains a fact from the base, cites the right step, doesn't invent". Runs in CI on prompt/model changes.
**DoD:** evals ≥90% pass; an answer without a source is impossible (guardrail is tested).
**Acceptance:** 10 tricky questions including hallucination bait.

### Phase 9 — Capacitor and app stores
**9a. Wrapper.** Capacitor over the same codebase; native: push deadline reminders (replacing email on mobile), share sheet, haptics, splash/icons. This is the mandatory minimum against Apple Guideline 4.2 ("repackaged website" gets rejected).
**9b. Release.** Store listings (RU/EN screenshots, copy), TestFlight + Play internal track, review pass.
**DoD:** app in TestFlight and internal testing; a deadline push arrives on a real phone.
**Acceptance:** 4.2 checklist (offline ✓, push ✓, native share ✓, app-like navigation ✓).

### Phase 10 — Launch, growth, showcase
**10a. Launch.** Posts in 5–7 olim chats (as help, not ads), a "built a free adaptation navigator" post on vc.ru/Habr, feedback monitoring, bugfix sprint.
**10b. Content top-up.** Weekly new steps driven by search logs ("searched and not found"); triage of step_reports.
**10c. Portfolio showcase.** README with architecture and screenshots, a "0 → product" case study for CV, EN landing about the project.
**DoD/metrics:** 100 plans and 500 searches in month one; ≥20% share rate; chat feedback collected.
**Acceptance:** full project retro + v2 roadmap (doctor/pensioner branches, Hebrew, partner monetization — optional).

## Order and dependencies

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10, strictly. The only parallel track is content (2c keeps being extended by separate Claude content sessions from Phase 2 until the end).
