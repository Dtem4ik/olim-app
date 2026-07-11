# Phase 2 — Data model and content pipeline

Status: **in progress** — sub-phase **2a (Supabase schema) is complete**; 2b
(content pipeline) and 2c (content v1) are **not started** (paused for review of
2a). This report will be extended as 2b/2c land.

Branch: `phase-2/data-model`. Commit for 2a: `feat(db): add Supabase content
schema, RLS, zod mirrors (Phase 2a)`.

---

## 2a — Supabase schema ✅

### Done

**Local Supabase dev stack**
- `supabase` CLI installed (Homebrew failed on outdated Xcode Command Line Tools,
  so the pinned release binary `v2.109.1` is used; `supabase` + `supabase-go`
  kept co-located, symlinked onto PATH). Docker Desktop running.
- `supabase init` → `supabase/config.toml` (unmodified defaults) + migrations dir.
- `supabase start` brings the stack up and applies migrations from scratch; a
  local `supabase db reset` re-applies cleanly.

**Migration `20260711145729_init_content_schema.sql`** — additive, entirely in
`public`. The shared `portfolio` schema is never referenced, altered, or granted
on (AGENTS.md rules 6 & 7). Objects created (all `public`):
- functions: `set_updated_at()`, `get_plan_by_share_slug(text)`
- tables: `sections`, `steps`, `benefits`, `plans`, `step_reports`
- indexes incl. a GIN index on `steps.cond`; `updated_at` triggers on all
  mutable tables.

Key column-level integrity (SQL CHECKs mirrored by the zod schemas):
- kebab-case slugs; `source_url` must be `https://`; title/summary/body length
  caps; `benefits` `valid_to >= valid_from` and a `(slug, valid_from)` unique
  key so dated benefit versions coexist; `plans.share_slug` length ≥ 12 (nanoid
  security bar); jsonb shape checks (`docs`/`tips` arrays, `cond`/`meta` objects).

**RLS from day one**
- `sections` / `steps` / `benefits`: public read (`anon`, `authenticated`); no
  client writes.
- `step_reports`: insert-only for the public; no select policy → cannot be read
  back through the API.
- `plans`: clients can create; owners (`authenticated`) read/update their own;
  public share-slug reads go through the `SECURITY DEFINER`
  `get_plan_by_share_slug()` so a table scan can never enumerate every plan.
- **Explicit grants** were required: this project runs with new-table
  auto-exposure disabled (current Supabase default), so `anon`/`authenticated`
  get no privileges on new `public` tables until granted. A live REST test caught
  this (SELECT returned 401 before grants were added).

**Type safety**
- `lib/content/schema.ts` — zod schemas mirroring every table (`*Input` authoring
  shape + `*Row` DB shape), plus the `cond` condition language
  (stage/basis/country/family/pet/children_ages/months_in_country) and the three
  `warn_rule` types (`expires_days`, `deadline_before_flight_days`,
  `deadline_after_arrival_days`). Personalization vocabularies are centralized
  here for the Phase 3 quiz to reuse.
- `lib/supabase/database.types.ts` — generated DB types (excluded from Biome and
  from coverage as generated code).
- `.env.example` — synced with the Vercel↔Supabase integration variable names
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, …) plus the localhost defaults.

**Tooling**
- Scripts: `db:start`, `db:stop`, `db:reset`, `db:types`. AGENTS.md Commands +
  a "Local Supabase" note updated.

### Verification

| Check | Command | Result |
|---|---|---|
| Typecheck | `pnpm typecheck` | ✅ no errors |
| Lint/format | `pnpm lint` | ✅ clean (generated types ignored) |
| Unit + coverage | `pnpm test:coverage` | ✅ 78 tests / 9 files, **97.7%** stmts |
| Migration from scratch | `pnpm db:reset` | ✅ applies clean |
| RLS — content read (anon) | REST `GET /rest/v1/{sections,steps,benefits}` | ✅ HTTP 200 |
| RLS — content write (anon) | REST `POST /rest/v1/{sections,steps}` | ✅ HTTP 401 (denied) |
| RLS — plans read (anon) | REST `GET /rest/v1/plans` | ✅ HTTP 401 (no grant; slug read via RPC) |

Reproduce the RLS checks after `pnpm db:start` using the anon key from
`supabase status` against `http://127.0.0.1:54321/rest/v1`.

### Notes / debts carried into 2b–2c

1. **Remote is untouched by design.** No `supabase link` / `db push` was run.
   Before the first push to the shared remote: take the `pg_dump -n portfolio`
   snapshot (rule 7), **and inspect the remote `public` schema first** — the
   portfolio's snapshot-cache tables may already live there
   (`.env.local` references `docs/supabase-schema.sql`); confirm no name clash
   with `sections`/`steps`/… before pushing.
2. `major_version = 17` in `config.toml` — verify it matches the remote
   (`SHOW server_version;`) before any push.
3. `plans` anonymous **update** (checking steps without an account) is Phase 5;
   2a ships create + owner-update + slug-read only.
4. `supabase db reset` prints a harmless `no files matched: supabase/seed.sql`
   warning — content is loaded via `content:import` (2b), not a seed file.

### Deferred (not started)

- **2b** — content JSON format, zod validator + content lint (banned phrases,
  https source_url allowlist), `content:import` (idempotent upsert),
  `content:check-links`, `content:review-queue`, `docs/CONTENT_SCHEMA.md`, the
  committed `content/fixtures/*.json` set, and the CI `content` job.
- **2c** — 60–90 authored RU steps across the 8 "after landing" sections with
  verified `source_url`s and 2026 benefit amounts in `benefits`.
- Phase-2 acceptance items that depend on 2b/2c (clean import from zero, content
  passing the validator in CI, review queue) are pending.
