# Phase 2 kickoff prompt

Preconditions (done by the user before this session): GitHub remote pushed with green Actions run; Vercel connected with a working preview; a private `olim-content` GitHub repo created (can be empty — this session fills it); Supabase env vars at hand. Do not start coding until `git remote -v` shows origin.

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 2 of the Olim App project. Read `AGENTS.md` (canonical rules), `docs/ROADMAP.md` (Phase 2 scope: 2a → 2b → 2c), `docs/PHASE_REPORTS/phase-1.md`, and `docs/reference/*.ru.md` (domain research — Russian, your content knowledge donor). Work STRICTLY within Phase 2. No quiz, no personalization engine, no UI screens beyond what already exists — those are Phases 3–4.

## CRITICAL — shared Supabase project

Olim App uses an EXISTING Supabase project (previously the portfolio's — the cloud project already exists, do not create a new one). The portfolio site's data lives in the `portfolio` schema of this same project and is IN PRODUCTION (dtem4ik.dev). Rules:

- Olim App owns the `public` schema ONLY. Never create, alter, or drop anything in the `portfolio` schema. Never touch its grants or its entry in Exposed schemas.
- All migrations must be additive and scoped to `public`. NEVER run destructive commands against the linked remote: `supabase db reset --linked`, dropping schemas, or any command that could affect `portfolio` is forbidden. Local resets (`supabase db reset` on the local dev stack) are fine.
- Neighbor backup ritual (AGENTS.md rule 7): before pushing ANY migration to the linked remote, take a fresh `pg_dump -n portfolio` snapshot (local only, never commit), state in the phase report that it was taken, and list exactly which objects the migration touches.
- Separation trigger (documented in the portfolio repo's docs/DB_MIGRATION.md): when olim-app gets real users or the shared DB approaches ~300MB, olim-app data stays and portfolio moves out — not this session's concern, just don't make it harder.

Setup step: if `.mcp.json` with the shadcn MCP server is not in the repo yet, run `pnpm dlx shadcn@latest mcp init --client claude` and commit the config (see "MCP setup" in AGENTS.md). This phase is data-focused, but the config must be in place for Phases 3+.

Language policy: repository is English (code, comments, commits, docs, reports). Chat with the user in Russian. Product content (step texts) is Russian user-facing data with EN keys structure per the content schema.

## 2a — Supabase schema

- Set up Supabase local dev (supabase CLI, `supabase start`), migrations committed to the repo. The cloud project already exists (shared, see CRITICAL above) — ask the user for its env vars (`.env.local`, documented in `.env.example`; the Vercel integration may use its own variable names — sync `.env.example` with the actual names).
- Tables: `sections`, `steps` (title, body_md, docs jsonb, warn_rule jsonb, tips jsonb, cond jsonb, source_url, last_verified_at), `benefits` (amount tables with valid_from dates), `plans` (share_slug unique nanoid ≥12, answers jsonb, done_step_ids jsonb, nullable user_id), `step_reports`.
- RLS enabled from day one: public read for content tables, insert-only for `step_reports`, `plans` readable by share_slug.
- Zod schemas mirroring every table in `lib/content/schema.ts`; generated DB types; unit tests for schema edge cases.

## 2b — Content pipeline

- **Content split (decision):** the app repo is public; real content lives in a SEPARATE PRIVATE repo `olim-content` (the user creates it; ask for the URL). Structure there: `content/*.json` + its own minimal Actions workflow running the validator. The public app repo contains: the schema, validator, import scripts, and a small committed fixture set (`content/fixtures/*.json`, 5–10 steps) used by unit/e2e tests and local dev.
- Local dev: `olim-content` is cloned as a sibling directory (document in README); `pnpm content:import` accepts a `--dir` pointing to it (defaults to fixtures). The import is an idempotent upsert into Supabase, safe to run repeatedly.
- Validator (zod) + content lint: required `source_url` (https, from an allowlist of trusted domains documented in `docs/CONTENT_SCHEMA.md`), required `last_verified_at`, title/body length limits, banned phrases list ("guaranteed", "мы гарантируем", legal-advice wording).
- Broken-link checker script (`pnpm content:check-links`) — report, non-blocking.
- Write `docs/CONTENT_SCHEMA.md`: format, field semantics, cond jsonb condition language (document every supported key: stage, basis, country, family, children_ages, pet, months_in_country ranges), warn_rule types (`expires_days`, `deadline_before_flight_days`, `deadline_after_arrival_days`).

## 2c — Content v1: "after landing" sections

Author draft content in Russian for sections: banks and money, rent, kupat holim/healthcare, work, olim benefits, transport, mobile/internet, Hebrew/ulpan. Target 60–90 steps total.

- Sources: gov.il (Ministry of Aliyah and Integration), Kol Zchut (kolzchut.org.il), Nativ, Bituach Leumi. Every step carries a real `source_url` you actually verified exists, and `last_verified_at` = today.
- Benefit amounts (sal klita 2026 etc.) go into `benefits` records with dates — never inline in step text.
- Every step gets `needs_review: true` flag — the user is the editor and will flip them after review. Add `pnpm content:review-queue` script listing unreviewed steps.
- Tone: a friend who already went through it. Short answer first, then "bring with you", then steps. No officialese, no guarantees, always "check the official source".

## DoD

- `supabase start` + `pnpm content:import` from scratch → app data layer fully populated locally.
- All content passes validator and lint in CI (add a `content` job).
- `docs/CONTENT_SCHEMA.md` complete; 60–90 steps drafted with real sources; review queue works.
- e2e smoke still green; Lighthouse budgets hold; RLS tested (anon cannot write to content tables).

Finish: `docs/PHASE_REPORTS/phase-2.md` (English) — done / deferred / debts / verification commands / how many steps per section, sources used. Update Commands in `AGENTS.md` and `docs/ARCHITECTURE.md` (data layer section).
