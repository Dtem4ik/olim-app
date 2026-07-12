# Phase 1 kickoff prompt

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 1 of the Olim App project — an adaptation navigator for new immigrants (olim) in Israel. Read `AGENTS.md` (canonical agent rules), `docs/ROADMAP.md` (full plan) and `CLAUDE.md`, then work STRICTLY within Phase 1 scope (1a → 1b → 1c). Do not touch anything from future phases, even if convenient.

Language policy: everything in the repository is English — code, comments, commit messages, PRs, docs, phase reports, branch names. Communicate with the user in chat in Russian. User-facing product strings go through next-intl dictionaries (RU now, EN keys ready), never hardcoded in JSX.

Task: build the repository foundation.

- Next.js App Router + TypeScript strict (no `any`, `noUncheckedIndexedAccess`).
- Tailwind with semantic theme tokens: light/dark via CSS variables, manual toggle + `prefers-color-scheme`. Hardcoded colors in components are a review blocker.
- shadcn/ui, Lucide icons, next-intl.
- Biome; lefthook (pre-commit: lint + typecheck on staged; commit-msg: commitlint conventional).
- Vitest + Testing Library; Playwright with a smoke test and axe checks (0 critical/serious violations in both themes).
- GitHub Actions pipeline: lint → typecheck → unit → build → e2e → lighthouse-ci (Performance ≥90, A11y ≥95, JS first-load budget 170KB). Vercel deploy with PR previews.
- Git: initialize the repo, atomic conventional commits from the first one.

UI kit v1: `SectionTile`, `StepCard`, `ChecklistItem`, `DeadlineBadge`, `SearchBar`, `BottomNav`, `EmptyState`. A `/dev/ui` page renders every component in both themes; each component has a render test and passes axe. Typography ≥14px, tap targets ≥44px, font with full Cyrillic + Latin support (Inter or Golos).

Finish by creating `docs/PHASE_REPORTS/phase-1.md` (English): what was done, verification commands, `/dev/ui` screenshots in both themes, known debts. Update the Commands section in `AGENTS.md`, and create `docs/ARCHITECTURE.md` describing the foundation you built.
