# Phase 8 kickoff prompt

Preconditions: Phase 7 merged + deployed; prod Auth URL config done (sign-in works live); reminder cron scheduled. `ANTHROPIC_API_KEY` (or chosen LLM key) ready for the user to add.

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 8 of the Olim App project. Read `AGENTS.md` (hard rules 6–7, Known traps, docs-sweep), `docs/ROADMAP.md`, `docs/PHASE_REPORTS/phase-6.md` (the search infra you build on) and `phase-7.md`, `docs/ARCHITECTURE.md`. Work STRICTLY within Phase 8. No Capacitor (Phase 9).

Language policy: repository is English; chat in Russian; user-facing strings via next-intl dictionaries.

## The one rule that matters most here

**The AI may only answer from retrieved content.** This is bureaucratic/legal-adjacent information; a hallucinated deadline or sum can harm a real person. Every answer is grounded in the app's own steps and shows its sources; if retrieval finds nothing relevant, the honest answer is "не нашёл — вот близкие разделы", never an invented one. This guardrail is tested, not assumed.

## 8a — Retrieval (pgvector, hybrid)

- Migration (additive, `public` only; neighbor ritual with dry-run + evidence): `vector` extension into `extensions`, an embedding column on `steps`, an IVFFlat/HNSW index. Embeddings generated in the content pipeline (`content:import` computes/updates them; document the model + dims). Backfill existing steps.
- **Hybrid retrieval**: combine the Phase 6 FTS (`search_steps`) with vector similarity — reciprocal-rank fusion or a documented weighting. Return top-k step chunks with their source metadata (title, section, source_url, last_verified_at).
- Keep it cheap: embeddings are computed at import time, not per query; only the user's query is embedded at request time. Rate-limit the embed+answer endpoint (reuse the Phase 5 limiter approach).

## 8b — Grounded answer ("Спроси об Израиле")

- Entry on the `/search` screen: a natural-language ask box above/alongside the existing keyword search (keyword search stays — AI augments, not replaces). Streamed answer.
- Prompt contract: system prompt forbids answering beyond the provided context; the model must cite which step(s) it used; the UI renders the answer followed by source cards (the same step tiles, tappable → the SSR sheet). "Не знаю" path renders closest sections.
- Model via server route (never expose the key client-side); the LLM key is env-gated — without it, the ask box degrades to a friendly "AI-ответы скоро" and keyword search still works (so CI/preview/local без ключа не падают).
- Language: answer in the user's language (RU default); never fabricate Hebrew terms.

## 8c — Evals (the acceptance gate, not optional)

- A committed eval set of ~50 reference questions (RU) spanning: answerable-from-content, out-of-scope (must refuse), typo/transliteration, and dangerous-if-hallucinated (specific sums/deadlines — the answer must match the content's benefit/warn data or refuse).
- Automated eval runner (`pnpm eval`): for each question assert (a) answer cites a real step slug that exists, (b) no claim contradicts the source step, (c) out-of-scope questions get the refusal path. Score reported; **gate ≥90% pass**, and **zero** fabricated-source or contradicted-fact failures allowed. Runs in CI when the LLM key is present; skips gracefully without it (documented).

## DoD

- Retrieval: hybrid search returns sensible top-k on the full content set; embeddings backfilled; migration pushed with ritual evidence.
- Answers: grounded, streamed, sourced; no-answer path honest; key-absent degradation verified (build/preview without key is green).
- Evals ≥90% pass, 0 fabricated-source / 0 contradicted-fact; committed eval set + runner + CI wiring.
- e2e: ask a known question → sourced answer with tappable step cards; ask an out-of-scope question → refusal + sections; axe clean both themes; keyword search still works. Lighthouse/JS gates hold (LLM client stays server-side).
- Docs sweep (README, ARCHITECTURE AI-search section incl. model/dims/cost note, ROADMAP).

Finish: `docs/PHASE_REPORTS/phase-8.md` — done / deferred / debts / verification / ritual evidence / eval scores table / screenshots (ask answer with sources, refusal path) / cost-per-query estimate.
