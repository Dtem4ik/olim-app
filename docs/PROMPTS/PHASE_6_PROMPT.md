# Phase 6 kickoff prompt (v2 — updated after the native-UI redesign, PR #7)

Preconditions: PR #7 (redesign) merged into `main`; `olim-content` pushed (image_url commits) and re-imported so section photos are live in prod.

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 6 of the Olim App project. Read `AGENTS.md` (hard rules 6–7, docs-sweep rule, **Known traps** — animations vs Lighthouse/axe), `docs/ROADMAP.md`, `docs/PHASE_REPORTS/phase-5.md`, and the redesign state in `main` (there was an off-roadmap native-UI redesign: photo tiles, bottom-sheet step view with SSR content and URL sync, floating pill nav, `/search` screen shell). Work STRICTLY within Phase 6. No accounts (Phase 7), no AI/pgvector (Phase 8).

Language policy: repository is English; chat in Russian; user-facing strings via next-intl dictionaries.

## Housekeeping (early commit)

- **Roadmap actualization:** update `docs/ROADMAP.md` phases 6–10 to reflect the redesign deltas: 6a = wire real search into the existing `/search` screen; 6b = SEO on top of the existing SSR step sheets; Phase 9 notes that the app-like UI (sheets, pill nav, animations) strengthens the Apple 4.2 case. Record redesign debts: `/dev/ui` refresh, card radius consistency, `@tailwindcss/oxide` patch watch.
- **Image provenance:** document photo sources + licenses (e.g. Unsplash) in `docs/ARCHITECTURE.md` or a `docs/IMAGES.md`; add attribution if the license asks for it. If any image lacks a clear license — flag to the user, don't ship it.
- Commit the already-written `docs/PHASE_REPORTS/phase-5.5-redesign.md` (it sits untracked in the working tree — review it against the actual code state, fix any inaccuracies, then commit). The phase-report chain must have no gaps.

## 6a — Real full-text search (into the existing `/search` screen)

- Migration (additive, `public` only; neighbor ritual with evidence before any remote push): tsvector (russian config) over steps title/summary/body + pg_trgm for typo tolerance; document how transliterated terms (купат холим / рав-кав) behave and what fallback covers them (trigram).
- Server-side search API; debounced autocomplete; results grouped steps (with section badge + photo tile style consistent with the redesign) → sections; result tap opens the section with the step sheet raised (reuse the existing deep-link behavior). Empty state suggests sections.
- Query restore on back-nav already exists — keep it working (e2e).
- Perf: <150ms locally on the full set. PostHog `search_performed` through the env-gated facade.

## 6b — SEO on top of the SSR step sheets

- The redesign already gives each step SSR content + own title/description via sheet URLs. Build on it: canonical URLs (decide: are sheet URLs the canonical step pages, or do dedicated `/gid/...` pages make more sense for snippets? — decide and justify), `sitemap.xml` from the DB (all sections + steps), `robots.txt` (`/plan/*` stays noindex), structured data where honest (HowTo/FAQ per step format), per-page OG images reusing the Phase 5 OG infra.
- **Freshness (closes the standing debt):** ISR or on-demand revalidation triggered by `content:import` — new content must not require a redeploy. Apply to home/guides/search-indexed pages; document the strategy in ARCHITECTURE.
- Verify content renders with JS disabled on step/section URLs; Lighthouse SEO ≥95 on them; RU-language SEO (the audience googles in Russian).

## DoD

- e2e: search by exact word / typo / partial; tap-through to raised sheet; query restore; keyboard + touch; axe clean both themes (use `settleAnimations` per Known traps).
- Sitemap lists all sections+steps; SEO pages pass with JS off; Lighthouse SEO ≥95; perf/a11y hard gates hold; JS guard respected.
- Remote migration push follows the neighbor ritual with evidence in the report.
- Docs sweep per hard rule (README status, ARCHITECTURE search/SEO/freshness, ROADMAP actualized).

Finish: `docs/PHASE_REPORTS/phase-6.md` (English) — done / deferred / debts / verification / ritual evidence / screenshots (search flow on mobile, SEO page) / shadcn audit note (incl. the sheet/Drawer registry decision if not yet recorded).
