# Phase 7 kickoff prompt

Preconditions: Phase 6 merged and deployed (search + SEO live on prod); `REVALIDATE_SECRET` set in Vercel; Google Search Console verified with sitemap submitted (user task, non-blocking).

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 7 of the Olim App project. Read `AGENTS.md` (hard rules 6–7, Known traps, docs-sweep rule), `docs/ROADMAP.md`, `docs/PHASE_REPORTS/phase-6.md` (note its debts — especially the `.env` split), and `docs/ARCHITECTURE.md`. Work STRICTLY within Phase 7. No AI/pgvector (Phase 8), no Capacitor (Phase 9).

Language policy: repository is English; chat in Russian; user-facing strings via next-intl dictionaries.

## Product principle for this phase (non-negotiable)

**Anonymous-first stays.** An account is NEVER required for the core flows (quiz, plan, guides, search, sharing). Signing in adds exactly two things: cross-device sync and deadline reminders. No login walls, no nagging; one calm entry point on the Profile screen ("Сохранить план в аккаунт — синхронизация и напоминания").

## Housekeeping (early commit)

- Close Phase 6 debt #2: introduce `.env.development.local` pointing at the local stack (`127.0.0.1:54321`) so `pnpm dev` is local-first; `.env.local` keeps prod values for explicit prod-facing work. Document the split in CONTRIBUTING + `.env.example`.

## 7a — Accounts (Supabase Auth)

- Providers: **magic link** (RU email template — configure in Supabase dashboard, walk the user through it) + **Google OAuth** (walk the user through Google Cloud Console + Supabase provider config; ask for the credentials when needed).
- Sign-in UI on the Profile screen in the redesign language (photo/avatar header already exists). States: anonymous / signed-in (email, avatar initial, sign out).
- **Migration on first sign-in:** localStorage profile + progress + (if any) created share-plans merge into the account. Decide and document the storage model: extend `plans` (user_id already exists) as the single user-state row vs. a new `user_state` table — justify in ARCHITECTURE. Additive migration only; neighbor ritual with dry-run + evidence for any remote push.
- RLS: owner-scoped read/write on user state (policies for `plans.user_id` exist — extend as needed); **cross-user denial e2e test is mandatory**.
- Sync: signed-in state loads from DB and writes through (localStorage stays the offline cache — the PWA offline scenario must keep working signed-in and signed-out).
- **Account deletion** (privacy hygiene, do not skip): Profile → delete account → removes auth user + owned rows; confirm flow; document data retention in a short `docs/PRIVACY.md` note (plus what anonymous share-plans remain).
- Auth pool note: the Supabase project is shared with the portfolio site, which has NO auth users — the pool is effectively ours, but do not touch portfolio schema/config regardless.

## 7b — Deadline reminders (email)

- Opt-in per user (settings toggle + choice of lead time: 30/14/7 days). Storage on the user state row.
- Engine: scheduled **Supabase Edge Function** (cron) that computes upcoming deadlines from each opted-in user's answers + warn_rules (reuse `buildPlan` logic — extract the deadline math into a shared lib consumable by Deno, or reimplement minimally with tests against the same fixtures), then sends via **Resend** (user creates the free account; ask for the API key; sender = onboarding domain for now, custom domain is a Phase 10 nicety).
- Email: RU, the redesign's tone ("Через 14 дней сгорает льготный обмен прав — вот что взять с собой"), deep link to the step, unsubscribe link (one-click, no login).
- Idempotency: a sent-log table so a reminder never fires twice for the same (user, step, threshold); additive migration, ritual applies.
- Local testing: Edge Function runs on the local stack; e2e or integration test proves the reminder computation; actual email delivery verified once manually to the user's own inbox.

## DoD

- e2e: anon quiz+progress → sign in (magic link via local Inbucket) → state migrated → second device (fresh context) sees it → sign out keeps local cache → cross-user denial test. axe clean on new screens, both themes.
- Reminder function: unit-tested date math; one real email received; sent-log prevents duplicates (test).
- Account deletion works end-to-end; PRIVACY.md committed.
- Lighthouse gates hold; JS guard respected (auth SDK weight — measure and report; lazy-load it on the Profile route if needed).
- Remote pushes with ritual evidence (dry-run included). Docs sweep per hard rule.

Finish: `docs/PHASE_REPORTS/phase-7.md` (English) — done / deferred / debts / verification / ritual evidence / screenshots (sign-in, settings, email in inbox) / storage-model justification.
