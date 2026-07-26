# Case study — Olim App (0 → product)

A free adaptation navigator for new immigrants to Israel, taken from an empty repo to
a launch-ready web/PWA product. This is the engineering story: the problem, the
phased AI-assisted workflow, the decisions and trade-offs that shaped it, and the
measurable outcomes. Written to be read cold — no inflated claims.

## The problem

New immigrants (_olim_) land into a wall of bureaucracy with hard deadlines and real
money attached: register with a health fund within 90 days, exchange a driver's licence
within a year, claim the absorption basket, tax credits, child allowance. The
information exists — gov.il, Kol Zchut, Bituach Leumi — but it's scattered, in Hebrew,
undated, and not personalized to _your_ situation. Acting on a stale number or a missed
window has consequences.

**Goal:** a personalized, trustworthy, mobile-first navigator that says _what to do,
by when, for your situation_ — and always links the official source with a visible
"last verified" date, never guaranteeing outcomes.

## The workflow: phased, AI-assisted, review-gated

The project was built in **discrete phases** (foundation → data model → personalization
engine → home/guides → plan/PWA → search/SEO → accounts/reminders → AI search → launch
prep → MVP closure), each executed in its own Claude Code session against a written
kickoff prompt and finished with a phase report, then reviewed by a separate team-lead
session before the next phase started.

Why this shape:

- **Scope control.** "Phase scope is law" — a session never implements future-phase work.
  Scope creep is the #1 killer of solo projects; the phase boundary is the guardrail.
- **A durable paper trail.** Every phase leaves a report (done / deferred / debts /
  verification), so context survives across sessions and the next session starts informed.
- **A canonical instruction file (`AGENTS.md`).** One source of truth for hard rules
  (language policy, additive-only migrations, content-is-data, no hardcoded colors) that
  every AI session and human reads first.

Content grew on a **parallel track**: dedicated content-authoring sessions drafted steps
from official sources into a private repo; a validator + human editor gate kept them
honest. This separation — feature code vs. content data — is a core architectural choice,
not an accident.

## Key engineering decisions & trade-offs

**Content is data, not code.** Guide text lives in a private `olim-content` repo as JSON,
passes a zod schema + editorial lint (required `source_url`, length limits, banned
phrases, freshness), and is imported into Supabase. Components render data; they never
embed content. _Trade-off:_ an import/validate pipeline to build and maintain, bought in
exchange for content that can be reviewed, versioned, fact-checked, and updated without a
deploy (ISR + on-demand revalidation).

**Grounded RAG behind an eval gate.** The AI answer is retrieval-augmented and
instructed to reproduce **only** what's in the retrieved steps — never a stronger or more
specific version — and to cite the steps it used. A committed eval set runs the real
retrieval+answer pipeline and, via an LLM judge, asserts **0 fabricated sources** and
**0 contradicted facts**, with a ≥90% pass floor. For legally-sensitive info an invented
sum or deadline is the real harm, so the gate optimizes against that specifically.
_Trade-off:_ the model sometimes stays terser than a chattier assistant would — accepted,
because silence is safe and a wrong number isn't.

**Hybrid retrieval (FTS + vector) fused with RRF.** Keyword full-text search (Postgres
tsvector + trigram for typos and transliterated Hebrew) and vector similarity (pgvector
over Gemini embeddings) each return a ranking; Reciprocal Rank Fusion combines them
without needing comparable scores. _Trade-off:_ two indexes to maintain, bought for
recall that neither arm reaches alone — a lesson paid for when a late corpus tripling
dropped expected steps out of a vector-only top-k until embeddings were backfilled.

**Anonymous-first accounts.** The plan works with zero sign-up (localStorage); an account
is optional and, on first sign-in, the local plan migrates and syncs cross-device, with
row-level security on every user-data table. _Trade-off:_ a sync/migration path to get
right, in exchange for value-before-friction and reminders that don't gate on an account.

**Shared database, guarded by ritual.** The Supabase project is shared with another
production site. Rather than provision a second project, the rule is: additive,
`public`-scoped migrations only, preceded by a backup snapshot of the neighbor's schema
and an object list in the phase report. _Trade-off:_ discipline over convenience — the
cheap path (a second project) was declined in favor of a documented, auditable ritual.

**Per-route performance budgets.** Lighthouse gates (Performance ≥90, A11y ≥95) run on
every route in CI, with a JS first-load regression guard. The user-facing metrics are the
hard gates; raw byte count is a coarse proxy, not the goal. _Trade-off:_ the original
170KB JS target proved unrealistic against the Next 16 + React 19 framework floor, so it
was reset to a guard that catches regressions without chasing a number the gates don't
need.

**PII-masked session replay.** Analytics (PostHog) and errors (Sentry) are env-gated and
lazy-loaded so they never cost the user speed; session replay is sampled (~15%) and masks
all inputs, so the city, dates and children's ages are never recorded.

## Measurable outcomes

- **Content corpus:** 16 sections · 111 steps · 7 benefit figures, every step sourced and
  date-verified.
- **Tests:** 294 unit tests; `lib/` ≥80% coverage; the personalization engine (`buildPlan`)
  at **100%**. Playwright e2e + axe (0 critical/serious) in both themes.
- **AI grounding:** `pnpm eval` — **66/66 = 100%** pass, **0 fabricated sources, 0
  contradicted facts** (transcript committed). The gate runs in CI on retrieval/eval/schema
  changes.
- **Performance/quality:** Lighthouse hard gates green on every route (Performance ≥90,
  A11y ≥95); JS first-load within the ≤280KB regression guard.
- **SEO:** DB-driven `sitemap.xml` / `robots.txt`, canonical step/section pages that render
  with JS disabled, JSON-LD, and per-page OG images.

## What's deliberately out of MVP

App stores via Capacitor ($99/yr Apple fee + slow review) are deferred until the web/PWA
proves demand; Web Push (VAPID) is the first post-launch candidate. Both are demand-gated,
not forgotten — the reasoning lives in `docs/ROADMAP.md` and `docs/LAUNCH_CHECKLIST.md`.
The MVP is closed on a zero-debt basis: every deferred item from earlier phases is
resolved as either done or explicitly out-of-MVP (see `docs/PHASE_REPORTS/phase-10.md`).
