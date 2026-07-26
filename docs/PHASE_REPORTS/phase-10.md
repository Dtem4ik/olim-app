# Phase 10 — MVP code closure + showcase

Goal: make "MVP is done by code" a true statement — close every open code debt from
phases 5–9 (zero-debt rule + ledger), plus the showcase deliverables. No new features
beyond the A/B/C list. The launch/growth half lives in `docs/LAUNCH_CHECKLIST.md` and
belongs to the owner.

**Scope note:** the A block (must) is fully done. Of the B block, B0/B2/B3/B4 and both
C decisions are done; **B1 (quiz age/pension + pregnancy dimensions) was deferred to a
focused phase 10b by owner decision** during the session (it is a large schema+quiz+
engine+content change; half-doing it would create exactly the debt this phase exists to
prevent). B1 is classified in the ledger below.

---

## A1 — Reminders working end-to-end ✅

- **Schedule now lives in the repo** as an additive migration
  (`supabase/migrations/20260726120000_schedule_reminders_cron.sql`): `pg_cron` fires
  daily (06:00 UTC) and `pg_net` POSTs to the `send-reminders` Edge Function. The
  function URL + service key are read from **Vault at run time** by name, so no secret
  or project-specific URL is committed. If the Vault secrets are absent it is a **clean
  no-op** (verified: the command's `FROM vault.decrypted_secrets … WHERE name=…` yields
  0 rows → `net.http_post` never called, exit 0, no error) — safe on a fresh local stack
  and on prod before the owner sets the secrets.
- Verified on the **local stack**: `pg_cron` (1.6.4) + `pg_net` (0.20.3) + `vault`
  (0.3.1) present; migration applies clean; `cron.job` lists `send-reminders-daily`
  (`0 6 * * *`, active).
- **Resend as the Auth SMTP provider** — documented exact dashboard steps in
  LAUNCH_CHECKLIST (host `smtp.resend.com:465`, user `resend`, pass = API key), which is
  what unblocks the RU magic-link template (`supabase/templates/magic_link.html`, already
  in the repo) **and** real sending volume. A commented Resend reference added to
  `supabase/config.toml` (local keeps Mailpit).
- **Owner-gated remainder (raised in chat):** actually scheduling on prod needs (a) the
  migration applied to the shared remote — deferred to the owner via the neighbor ritual
  (not pushed this session; see Ritual note), and (b) two Vault secrets +
  `RESEND_API_KEY`. Exact steps are in LAUNCH_CHECKLIST → "Reminder cron" and "Resend as
  the Auth SMTP". After that, the DoD's "a real reminder + magic-link email arrive" is a
  single key-paste away.

## A2 — Benefit amounts: no blanks in front of users ✅ (built as content-inline, owner-chosen)

Discovery raised in chat: the `benefits` table was **imported but rendered on no
screen**, and the `minimum-wage` step referenced a non-existent "раздел Льготы/суммы".
So there were no blanks in the UI only because there were no amounts in the UI at all.
Owner chose **variant B: surface the numbers where users actually read them** (in the
step), not a standalone benefits screen.

- **Minimum wage filled from the official source** (Kol Zchut / chamber-of-commerce
  April-2026 notice, cross-checked): **6 443,85 ₪/mo · 35,40 ₪/hr, effective 2026-04-01**.
  Written inline into the `minimum-wage` step body + summary (`work.json`), and the
  dangling section reference removed. The `benefits` rows are filled to match (structured
  record). Bonus: the inline figure strengthens AI retrieval for `danger-min-wage` (A3).
- **Sal klita** stays composition-dependent (`amount: null` **by design**): the
  `sal-klita-schedule` step + the benefit rows now link the Ministry of Aliyah
  **entitlement calculator** (`gov.il/he/service/service_entitlement_calculator`) instead
  of implying a fixed sum. No blank / "null" / "0 ₪" anywhere (verified; only 2
  intentional `amount: null` rows remain, both sal klita).
- **`docs/CONTENT_REVIEW.md`** added: what is annually revised and when (min wage —
  April; child allowance / Bituach Leumi — January), where each figure lives, and the
  composition-dependent items.
- Also (owner request): the step "verified" date now renders **DD.MM.YYYY** ("Проверено
  26.07.2026") via next-intl's formatter instead of raw ISO.

## A3 — AI retrieval tuning: 3 known eval misses ✅ (100%)

Root cause (found via a free retrieval-only probe): the 3 misses (`danger-min-wage`,
`danger-tax-points`, `employee-rights`) were a **stale-embedding artifact** — the
late-added Batch-B steps (2026-07-24) had NULL embeddings locally, so their vector arm
was empty and they dropped out of top-k. Prod already had 0 nulls. After backfilling the
11 local NULLs (via a targeted mini-bundle, under the 100-RPM embedding cap) all three
retrieve at **rank 0–1**; the A2 inline min-wage figure further strengthens
`danger-min-wage`. `retrieveSteps` now defaults `topK` to `RETRIEVAL_TOP_K` (config) —
one lever shared by retrieval and the answer path.

**`pnpm eval` (seeded local stack): 66/66 = 100% · 0 fabricated · 0 contradicted**
(target ≥95%, floor 90%). Transcript committed at
`docs/PHASE_REPORTS/assets/phase-10/eval-run.txt`.

| Question | before (phase 9) | after |
|---|---|---|
| `danger-min-wage` | miss (retrieval) | pass, rank 1 |
| `danger-tax-points` | miss (retrieval) | pass, rank 0 |
| `employee-rights` | miss (retrieval) | pass, rank 0 |
| overall | 63/66 (95.5%) | 66/66 (100%) |

## A4 — Eval gate on in CI ✅

Replaced the blanket `vars.RUN_AI_EVALS` opt-out with a **path trigger**: a tiny
`changes` job git-diffs the PR and the `evals` job runs only when `evals/`, `lib/rag/**`,
`scripts/eval.ts`, or the content schema (`lib/content/schema.ts`, `tables.ts`) change —
so grounding can't silently regress on a RAG/eval/schema change, while unrelated PRs
don't spend the Gemini free-tier RPD. Still self-skips (exit 0) until the owner sets the
`GEMINI_API_KEY` + `EVAL_SUPABASE_*` secrets (documented in the workflow + `.env.example`).

## B0 — One-variable domain swap ✅

Audit: **already centralized.** Every server-rendered absolute URL (canonical, sitemap,
robots, OG image URLs, JSON-LD) is built from one resolver (`lib/site-url.ts`:
`NEXT_PUBLIC_SITE_URL` → Vercel URL → localhost); client links (share, `/plan/{slug}`,
auth callback) use `window.location.origin` and follow the served domain automatically.
Closed the only gap: documented `NEXT_PUBLIC_SITE_URL` + the Edge Function `SITE_URL` in
`.env.example`, and added the exact **3 owner steps for domain day** (Vercel domain+env,
Supabase Auth URLs, Resend DNS) + a cheap-TLD deliverability caution to LAUNCH_CHECKLIST.
Product name stays "Olim" — no renaming.

## B2 — Sentry provable, replay confirmed ✅ (server-Sentry classified NOT-MVP)

- Added **`/dev/sentry-check`** — a guarded route (404s when `VERCEL_ENV=production`, so
  never a public prod error endpoint) that fires a real `captureException`, so the owner
  can prove ingestion on a preview deploy. Verify steps documented in LAUNCH_CHECKLIST.
- **Session replay confirmed:** documented how to verify in the PostHog UI (Session
  Replay tab → recordings exist + inputs masked), that `maskAllInputs` is on, and that
  `SESSION_REPLAY_SAMPLE_RATE` (`lib/session-replay.ts`) is the single lever.
- **Owner decision (speed priority):** current Sentry is client-only + lazy (no server/
  edge capture, no source maps). Expanding to full-stack was declined for MVP — the
  wizard's eager client SDK would hurt the JS budget the owner is protecting, and server
  errors are visible in Vercel logs. Classified NOT-MVP (see ledger). The `/dev/sentry-check`
  route works with any Sentry init if expanded later.

## B3 — Housekeeping ✅

- **Card-radius normalized to one token:** the shadcn `Card` primitive + `StepCard`
  wrapper were `rounded-xl` while every other content card is `rounded-2xl`; aligned them.
  The form-control (`lg`) and hero/photo/accent (`3xl`) families stay as deliberate,
  role-based scales.
- **Image provenance (IMAGES.md):** per-photo Unsplash URLs were never captured and can't
  be recovered truthfully; the Unsplash License needs no attribution, so the inventory +
  license record fully cover the MVP. Closed NOT-MVP with the forward rule (log new images
  at selection) intact.
- **`@tailwindcss/oxide` `@layer` trap:** re-checked — v4.3.3 does **not** fix it (its
  notes cover preprocessor/nesting/color/spacing; the layer-order issue is still open,
  Discussion #16109). Local-only (CI/prod-deploy unaffected). Kept the note; NOT-MVP.
- **`/dev/ui` refresh:** dev-only design reference, not shipped and not user-facing —
  classified NOT-MVP rather than sink launch budget into a non-product page (the redesign
  primitives are exercised by real screens + e2e).

## B4 — Showcase ✅

- **README** rewritten portfolio-grade: what it is, live link, **4 current mobile
  screenshots** (home/step/plan/guides, captured fresh from the running app),
  feature list, stack, and an **architecture** section with a mermaid data-flow diagram.
- **`docs/CASE_STUDY.md`** — the "0 → product" story: problem, the phased AI-assisted
  workflow, key decisions/trade-offs (grounded RAG + eval gate, hybrid retrieval,
  anonymous-first, shared-DB ritual, perf budgets, PII-masked replay), measurable
  outcomes. Factual, no inflated claims.

## C — Decide, don't defer ✅

- **JS first-load / 280KB guard → NOT-MVP.** The user-facing gates pass with margin
  (Performance ≥90, A11y ≥95, LCP) and first-load sits under the ≤280KB guard; byte count
  is an internal regression proxy, not a user metric. Trimming (message splitting, lazy
  zod) is uncertain-payoff work; closed as NOT-MVP.
- **`@tailwindcss/oxide` trap → NOT-MVP.** Not patched in 4.3.3 (verified); local-only,
  CI is the gate. Note kept. (Same as B3.)

---

## Verification

Run this session (local, from repo root):

```
pnpm typecheck                       # clean
pnpm test                            # 46 files, 294 tests passed
pnpm content:validate --dir ../olim-content/content   # 16 sections / 111 steps / 7 benefits — valid
pnpm eval                            # 66/66 = 100%, 0 fabricated, 0 contradicted (transcript committed)
pnpm build                           # production build compiles (all routes incl. /dev/sentry-check)
```

- **lint** — Biome via lefthook pre-commit (clean on every commit this phase).
- **e2e (Playwright + axe) & Lighthouse per-route** — the authoritative run is **CI on the
  PR**. Per AGENTS.md → Known traps, the local macOS-arm64 prod build mis-colours
  `<a>`/`<button>` and produces *false* dark-mode axe/Lighthouse failures, so local runs
  of these two are intentionally not trusted; CI (Linux) is the gate. The production build
  compiling clean this session is the local signal.
- **JS first-load:** within the ≤280KB CI guard (~245–270KB range, unchanged this phase —
  no client deps added; the Sentry SDK stays lazy).

## Neighbor ritual (AGENTS.md rules 6 & 7)

**No migration was pushed to the shared remote this session**, so no `pg_dump -n
portfolio` snapshot was taken (the rule is "no snapshot — no push"; there was no push).
The one new migration (A1 cron schedule) is additive and touches only the `cron` / `net`
/ `vault` schemas (never `portfolio`); it was applied and verified on the **local stack
only**. Applying it to the shared remote is owner-gated (needs the ritual + the owner's
Vault secrets) and is listed as an owner step in LAUNCH_CHECKLIST.

## Screenshots

`docs/img/screenshots/{home,step,plan,guides}.png` — captured fresh from the running app
(mobile 390×844, dev-tools indicator hidden). The step shot shows the A2 inline min-wage
figures + the DD.MM.YYYY verified date.

---

## Debt ledger (phases 5–9 → DONE or NOT-MVP)

Every "Deferred / debts" item from phases 5, 6, 7, 8 (incl. the content-stream addendum)
and 9. No third category.

| # | Item (source phase) | Outcome | Evidence / reason |
|---|---|---|---|
| 5.1 | Vercel prod rebuild for statically-baked content | **DONE** | Closed by Phase 6 ISR + on-demand revalidation; content goes live without a redeploy. |
| 5.2 | Share round-trip e2e | **DONE** | Done in Phase 5 (`plan.spec`, local DB-backed). |
| 5.3 | Telegram unfurl (manual) | **DONE** | OG code verified rendering; the actual post is an owner launch step (LAUNCH_CHECKLIST P3). |
| 5.4 | Airplane-mode real-phone test | **DONE (code)** | Offline plan + SW verified under network-off; a physical phone check is an owner launch step. |
| 5.5 | `/plan/[slug]` Lighthouse | **NOT-MVP** | Dynamic route needs a seeded share slug (else 404); the static routes carry the per-route perf/a11y gates. |
| 5.6 | OG font fetch → bundle the subset | **NOT-MVP** | Works today with a graceful fallback; bundling is a micro-optimization, not a blocker. |
| 6.1 | Remote search migration push | **DONE** | Pushed + verified in Phase 6 (ritual evidence in phase-6 report). |
| 6.2 | `.env.local` points at prod (local-first dev) | **DONE** | `.env.example` documents the `.env.development.local` local-first split. |
| 6.3 | Local prod-build gotchas (oxide colours, `rm -rf .next`) | **NOT-MVP** | Local-only; CI (Linux) builds clean and is the gate. Documented in AGENTS Known traps. |
| 6.4 | Per-photo Unsplash URLs in IMAGES.md | **NOT-MVP** | URLs never captured + not recoverable truthfully; Unsplash License needs no attribution; inventory + license cover the MVP (B3). |
| 7.1 | Google OAuth verify on https | **DONE (code)** | Provider configured; code path verified (Phase 9e). Live https check is an owner launch step. |
| 7.2 / 7.4 | Reminder cron scheduling (in dashboard, not repo) | **DONE** | A1: additive `pg_cron`+`pg_net` migration in the repo, verified locally. |
| 7.3 | Supabase Auth URL config on prod | **OWNER-MANUAL** | Dashboard step, documented (LAUNCH_CHECKLIST P3 + domain day). Not code. |
| 7.5 | Prod RU magic-link template | **DONE** | Template in repo (`supabase/templates/magic_link.html`) + exact Resend-SMTP paste steps documented (A1). |
| 8.1 | Live prod `/api/ask` (GEMINI key) | **OWNER-MANUAL** | Code ready + env-gated; owner adds `GEMINI_API_KEY` + redeploy (LAUNCH_CHECKLIST P3). |
| 8.2 | Eval gate opt-in in CI | **DONE** | A4: path-triggered `evals` job on RAG/eval/schema changes. |
| 8.3 | Grounding tightness on tiny models | **NOT-MVP** | Benign true generalizations only; the judge scopes harm-class; gate holds 0 fabricated / 0 contradicted at 100%. |
| 8-add.1 | Embedding backfill for late steps | **DONE** | Prod 0 nulls (Phase 8 addendum); local 0 nulls this session; verified via probe. |
| 8-add.2 | Eval set stale for new topics | **DONE** | Expanded to 66 Qs (Phase 9c); re-run 100% this phase (A3). |
| 8-add.3 | Standing content cadence | **NOT-MVP** | Growth activity (owner), not a code debt — content is the post-launch growth axis. |
| 8-add.4 / LC | Quiz vocabulary gaps (age/pension + pregnancy) | **NOT-MVP** (scheduled 10b) | The quiz already personalizes on 5 dimensions; these sharpen targeting for niche cases (pensioners, pregnancy) whose content stays reachable via `family` / sections / search. An enhancement, not a blocker; owner-scheduled as phase 10b. |
| 9.1 | Capacitor + app stores | **NOT-MVP** | Deferred by owner launch plan ($99/yr Apple fee unjustified pre-demand); web/PWA first. |
| 9.2 | Retrieval tuning (3 eval misses) | **DONE** | A3: 66/66 = 100%, 0/0. |
| 9.3 | Owner-manual launch items (keys/dashboards/phone test) | **OWNER-MANUAL** | All ticked in LAUNCH_CHECKLIST; code side ready. |
| — | JS first-load 280KB guard (inherited every phase) | **NOT-MVP** | C decision: user-facing gates pass with margin; byte count is an internal proxy. |
| — | PostHog/Sentry keyless (inherited) | **OWNER-MANUAL** | Env-gated; owner adds keys + redeploy (LAUNCH_CHECKLIST P2). Sentry provable via `/dev/sentry-check` (B2). |
| — | `/dev/ui` refresh (inherited redesign debt) | **NOT-MVP** | Dev-only design reference, not shipped / not user-facing. |
| — | Server-side Sentry capture + source maps | **NOT-MVP** | Owner decision (speed): client-only capture works; full setup risks the JS budget; server errors in Vercel logs (B2). |

Every row is **DONE**, **NOT-MVP**, or **OWNER-MANUAL** (dashboard/key steps, code ready).
No row is unresolved or "later".

## Owner-manual items (code is ready — these are yours)

1. PostHog + Sentry + Gemini keys in Vercel → redeploy (LAUNCH_CHECKLIST P2/P3).
2. Supabase Auth URL Configuration + paste the RU magic-link template; wire Resend as the
   Auth SMTP provider (P3).
3. Reminder cron activation: set `RESEND_API_KEY` + the two Vault secrets; apply the cron
   migration to the shared remote via the neighbor ritual (P3).
4. Apply pending migrations to the shared remote (ritual) as part of the deploy.
5. Live phone test: magic-link + Google sign-in, anonymous-plan sync, AI answer, share
   unfurl (P3). Prove Sentry via `/dev/sentry-check` on a preview.
6. Domain day (when attaching a custom domain): the 3 steps in LAUNCH_CHECKLIST.

---

## MVP code status: **COMPLETE** — zero open code debts.

Every debt from phases 5–9 is DONE or NOT-MVP (with reasons above). The remaining items
are **owner-manual** (keys/dashboards/phone test — code is ready) or **growth** (launch,
content cadence). The single deferred engineering item, the quiz age/pension + pregnancy
dimensions, is an owner-approved enhancement scheduled as **phase 10b** and is
classified NOT-MVP because the product is fully usable and personalized without it
(that content stays reachable via family targeting, sections, and search) — it sharpens
niche targeting, it does not block a finished MVP.
