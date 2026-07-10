# AGENTS.md — guide for AI agents working on Olim App

This is the canonical instruction file for all AI coding agents (Claude Code, Cursor, Codex, etc.). Tool-specific files (`CLAUDE.md`) point here. If instructions ever conflict, this file wins.

## What this project is

Olim App — an adaptation navigator for new immigrants (olim) in Israel. Personalized home screen, practical guides (banks, rent, healthcare, work, benefits, Hebrew), a trackable plan with deadline warnings, search (AI-powered in Phase 8). RU/EN, light/dark, PWA first, app stores via Capacitor (Phase 9).

Stack: Next.js (App Router, TS strict) on Vercel · Supabase (Postgres, Auth, pgvector) · Tailwind + shadcn/ui · Lucide · next-intl. FastAPI only where the roadmap explicitly says so.

## Project map

| Path | Purpose |
|---|---|
| `docs/ROADMAP.md` | The 10-phase plan with DoD and acceptance checklists. Read first. |
| `docs/PHASE_REPORTS/` | One report per completed phase. Read the latest before working. |
| `docs/ARCHITECTURE.md` | System design (created in Phase 1, keep updated). |
| `docs/CONTENT_SCHEMA.md` | Content data format (created in Phase 2). |
| `docs/reference/*.ru.md` | Product research in Russian — domain knowledge donor, not code docs. |
| `PHASE_1_PROMPT.md` | Kickoff prompt for the first working session. |

## Hard rules

1. **Phase scope is law.** You work only within your assigned phase (see your kickoff prompt). Never implement future-phase features "while you're at it".
2. **Language policy.** Repository content — code, comments, commits, PRs, docs, reports, branches — is English. Chat with the user is Russian. User-facing strings live in next-intl dictionaries only (never hardcoded in JSX).
3. **Content is data.** Guide texts belong in Supabase/JSON per `docs/CONTENT_SCHEMA.md`, never in components. Every content step carries `source_url` and `last_verified_at`.
4. **No hardcoded colors** in components — semantic CSS-variable tokens only (light/dark themes must both work).
5. **Finish protocol.** Every session ends by writing `docs/PHASE_REPORTS/phase-{N}.md`: done / deferred+why / known debts / verification commands / screenshots or preview links. Update the Commands section below if scripts changed.

## Quality bar (CI-enforced)

- TypeScript strict, `noUncheckedIndexedAccess`, no `any`.
- Biome lint/format clean; lefthook hooks pass; Conventional Commits.
- Vitest: `lib/` coverage ≥80%, condition engine 100%. Playwright e2e smoke per phase + axe (0 critical/serious, both themes).
- Lighthouse mobile: Performance ≥90, A11y ≥95, JS first load <170KB.
- A11y: tap targets ≥44px, body text ≥14px, focus states, ARIA.
- Security: RLS on user-data tables; share slugs nanoid ≥12.

## Conventions

- Branches: `phase-N/short-description`. PRs into `main`, green CI required.
- Commits: atomic, `feat:` / `fix:` / `chore:` / `docs:` / `test:` / `refactor:`.
- Components in `components/`, pure logic in `lib/` (tested), route handlers thin.
- Prefer boring solutions; no new dependencies without a reason stated in the PR description.
- If you find a mistake in docs — fix the doc in the same PR, don't work around it silently.

## Commands

Populated in Phase 1. Keep current:

```
pnpm dev             # start the dev server (http://localhost:3000)
pnpm build           # production build
pnpm start           # serve the production build
pnpm lint            # Biome lint + format check
pnpm lint:fix        # Biome autofix (format + safe fixes)
pnpm typecheck       # tsc --noEmit
pnpm test            # Vitest unit run
pnpm test:coverage   # Vitest with v8 coverage
pnpm e2e             # Playwright smoke + axe (both themes); builds first locally
pnpm e2e:install     # install the Playwright chromium browser
pnpm lighthouse      # Lighthouse CI (perf ≥90, a11y ≥95)
pnpm content:import  # (Phase 2)
```

Node ≥20.11, pnpm 10. Git hooks are installed automatically via `pnpm install`
(lefthook). First-time e2e needs `pnpm e2e:install`.

## Domain crib sheet (so you don't have to guess)

- *Oleh / olim* — new immigrant(s) to Israel; *aliyah* — the immigration itself.
- *Teudat oleh* — immigrant ID issued at the airport; *teudat zehut* — Israeli ID card.
- *Sal klita* — "absorption basket", monthly payments to new olim (first 6 months).
- *Kupat holim* — health fund (HMO); registration is an early must-do step.
- *Ulpan* — free state Hebrew course; *arnona* — municipal tax (olim get a discount).
- Key official sources: gov.il (Ministry of Aliyah and Integration), Kol Zchut (kolzchut.org.il — state rights encyclopedia, has Russian), Nativ (consular checks for FSU countries), Bituach Leumi (national insurance).
- Sensitive: this is bureaucratic/legal-adjacent info. The product never guarantees outcomes, always links the official source, and shows `last_verified_at`. The AI search (Phase 8) must never answer beyond retrieved content.
