# Phase 2 — Data model and content pipeline

Status: **complete** (2a schema · 2b pipeline · 2c content v1).

Branch: `phase-2/data-model`. Commits:
- `feat(db): add Supabase content schema, RLS, zod mirrors (Phase 2a)`
- `feat(db): split basis descendant into child_of_jew / grandchild_of_jew`
- `feat(content): content pipeline — validator, lint, import, fixtures (Phase 2b)`
- `fix(content): narrow the banned guarantee stem to promise forms only`
- plus this report + ARCHITECTURE update.

Real content (2c) lives in the **private `olim-content` repo** (a local sibling
dir, committed there as `content: initial "after landing" content v1 (Phase 2c)`).

---

## 2a — Supabase schema ✅

- Local Supabase dev stack (CLI + Docker). Homebrew install failed on outdated
  Xcode CLT, so the pinned release binary `v2.109.1` is used (`supabase` +
  `supabase-go` co-located). `supabase start` / `db reset` apply migrations clean.
- Migration `init_content_schema` — additive, entirely in `public` (the shared
  `portfolio` schema is never touched). Tables `sections`, `steps`, `benefits`,
  `plans`, `step_reports` with CHECK constraints, indexes (incl. GIN on
  `steps.cond`), and `updated_at` triggers.
- **RLS from day one:** public read on content tables; insert-only `step_reports`;
  `plans` owner-scoped with a SECURITY DEFINER `get_plan_by_share_slug()` for safe
  public share-slug reads. Explicit grants (new-table auto-exposure is disabled —
  the current Supabase default; a live REST test caught this before it shipped).
- `lib/content/schema.ts` — zod mirrors of every table + the `cond` condition
  language and `warn_rule` types. `basis` splits `child_of_jew` /
  `grandchild_of_jew` (a major personalization fork). `lib/supabase/database.types.ts`
  generated from the local DB. `.env.example` synced with the Vercel integration
  variable names.

## 2b — Content pipeline ✅

- `lib/content/bundle.ts` — JSON bundle format, recursive dir loader, cross-file
  integrity checks (referential + slug uniqueness).
- `lib/content/lint.ts` — trusted-source allowlist (gov.il, btl.gov.il, nativ.gov.il,
  kolzchut.org.il, jewishagency.org), banned phrases (no guarantees / legal-advice
  wording; the Russian guarantee rule targets promise forms only, so legitimate
  terms like "банковская гарантия" pass), verification freshness.
- Scripts: `content:validate` (CI gate), `content:import` (idempotent upsert),
  `content:check-links` (non-blocking report), `content:review-queue`.
- **Safety:** `content:import` / `content:review-queue` default to the LOCAL stack
  and refuse a non-local target unless `--allow-remote` — the DB is shared with
  production. Verified: the guardrail aborts on a remote URL.
- `content/fixtures/` — 5 real steps / 4 sections / 2 benefits (committed) power
  tests and the CI `content` job. `docs/CONTENT_SCHEMA.md` documents the format,
  `cond`/`warn_rule` languages, and the allowlist. CI gained a `content` job.

## 2c — Content v1: "after landing" ✅ (partial vs. the 60–90 target)

Authored in Russian in the private `olim-content` repo. **8 sections, 46 steps,
4 benefit records.** Every step carries a real, individually search-verified
`source_url` and `last_verified_at`; every step is `needs_review: true` for the
human editor; benefit amounts are `null` pending editor verification of 2026
figures (amounts are never inlined in step text — AGENTS.md rule 3).

Steps per section:

| Section | Steps | Primary sources |
|---|---|---|
| Банки и деньги | 5 | Kol Zchut, gov.il (banking guide) |
| Здоровье и больничная касса | 5 | Bituach Leumi, Kol Zchut |
| Льготы репатрианта | 9 | gov.il (absorption basket, rights guide), Bituach Leumi, Kol Zchut |
| Аренда и жильё | 6 | Kol Zchut (arnona, rent assistance), gov.il |
| Работа | 7 | Kol Zchut (employment, min wage, contracts), gov.il |
| Транспорт | 6 | gov.il (license exchange), Kol Zchut (Rav-Kav, discounts) |
| Связь и интернет | 4 | Kol Zchut (consumer rights, long-term contracts) |
| Иврит и ульпан | 4 | Kol Zchut (ulpan), gov.il (first steps) |

Real deadlines encoded as `warn_rule`: kupat-holim registration
(`deadline_after_arrival_days: 90`), driving on a foreign licence
(`deadline_after_arrival_days: 365`).

Sources used: **gov.il** (Ministry of Aliyah and Integration — absorption basket,
rights guide, first steps, driving-license service, banking guide), **Kol Zchut**
(kolzchut.org.il — bank account, health-fund choice, arnona, rent assistance,
employment rights, minimum wage, transport, consumer rights, ulpan),
**Bituach Leumi** (btl.gov.il — kupat-holim registration, new-immigrant portal,
income guarantee).

## Verification

| Check | Command | Result |
|---|---|---|
| Typecheck | `pnpm typecheck` | ✅ |
| Lint/format | `pnpm lint` | ✅ (68 files) |
| Unit + coverage | `pnpm test:coverage` | ✅ 106 tests, 97.3% stmts (lib/content 97.6%) |
| Migration from scratch | `pnpm db:reset` | ✅ applies clean |
| Content validate (fixtures / CI) | `pnpm content:validate` | ✅ 4/5/2 valid |
| Content validate (2c) | `pnpm content:validate --dir ../olim-content/content` | ✅ 8/46/4 valid |
| Import from scratch | `db reset` → `pnpm content:import --dir ../olim-content/content` | ✅ 8 sections / 46 steps / 4 benefits (2 warn_rules) |
| Idempotent re-import | run twice | ✅ counts unchanged |
| Review queue | `pnpm content:review-queue` | ✅ lists 46 unreviewed steps |
| RLS — content write (anon) | REST `POST` sections/steps | ✅ HTTP 401 (denied) |
| RLS — content read (anon) | REST `GET` sections/steps/benefits | ✅ HTTP 200 |
| Remote guardrail | `content:import --url <remote>` (no flag) | ✅ refuses, non-zero exit |
| Link check | `content:check-links --dir ../olim-content/content` | report only; gov.il/kolzchut return 403 (bot protection, not dead links); btl.gov.il 200 |

## Deferred / debts

1. **2c step count: 46 vs. the 60–90 DoD target.** Deliberate trade-off: every
   step maps to a genuinely search-verified official source rather than padding
   with weak/niche sources. The pipeline (`review-queue`, idempotent import) and
   the roadmap's "content extended by separate sessions" model are built for
   incremental growth; extending to 60–90 is straightforward follow-up content
   work. Additional relevant Kol Zchut/Bituach Leumi URLs were seen during
   research and can seed the next batch.
2. **`olim-content` is a local git repo without a remote.** The user must add the
   private-repo remote and push; it also needs its own minimal Actions workflow
   (checkout `olim-app` alongside, run `content:validate --dir`). Documented in
   `olim-content/README.md`.
3. **Remote is untouched by design.** No `supabase link` / `db push`. Before the
   first push to the shared remote: take the `pg_dump -n portfolio` snapshot
   (rule 7) **and inspect the remote `public` schema first** — the portfolio's
   snapshot-cache tables may already live there; confirm no name clash with
   `sections`/`steps`/… Also verify `config.toml` `major_version = 17` matches the
   remote (`SHOW server_version;`).
4. **Benefit amounts are `null`** and every step is `needs_review: true` — awaiting
   the human editor. `content:check-links` reports 403 for bot-protected official
   domains; verify those links in a browser.
5. `link`-check + author tone are not machine-graded; the editor spot-checks
   sources on acceptance.

## Setup notes for reviewers

- Local stack: install `supabase` CLI, start Docker, `pnpm db:start`, then
  `pnpm content:import --dir ../olim-content/content`.
- Clone `olim-content` as a sibling of `olim-app` (`../olim-content`).
