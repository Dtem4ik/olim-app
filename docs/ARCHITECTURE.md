# Architecture

The system design of Olim App. Created in Phase 1; keep it current as later phases
add data, personalization, search and native wrappers.

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | React 19, RSC by default |
| Language | TypeScript 5 (strict) | `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, no `any` |
| Styling | Tailwind CSS v4 | CSS-first config in `app/globals.css` (`@theme inline`) |
| Components | shadcn/ui + custom | primitives copied via the shadcn CLI, adapted to our tokens |
| Icons | lucide-react | named imports (tree-shaken) |
| i18n | next-intl 4 | single-locale (RU) now, EN keys ready; no locale routing yet |
| Theming | next-themes | `class` strategy, system + manual toggle |
| Lint/format | Biome 2 | one tool for both |
| Git hooks | lefthook | pre-commit: Biome + typecheck on staged; commit-msg: commitlint |
| Unit tests | Vitest + Testing Library | jsdom, coverage via v8 |
| E2E / a11y | Playwright + @axe-core/playwright | smoke + axe in both themes, Desktop + mobile |
| Perf budgets | Lighthouse CI | perf ≥90, a11y ≥95 enforced |
| Hosting | Vercel | PR previews, brotli-compressed assets |

## Directory layout

```
app/                 App Router routes
  layout.tsx         html shell, fonts, ThemeProvider + NextIntlClientProvider
  page.tsx           home (server component)
  globals.css        Tailwind entry + design tokens (light/.light, .dark)
  dev/ui/page.tsx    UI-kit showcase (single theme, toggled)
components/          product components (SectionTile, StepCard, …)
  ui/                shadcn primitives (Button, Card, Badge, Input, Checkbox)
lib/                 pure, unit-tested logic (deadline, cn) + *.test.ts
i18n/request.ts      next-intl request config (locale + messages)
messages/            ru.json (shipping), en.json (keys ready)
test/                Testing Library render helper (providers)
tests/e2e/           Playwright specs
```

## Design tokens & theming

Semantic tokens are CSS variables defined in `app/globals.css` and mapped into
Tailwind via `@theme inline`, so components only ever use semantic utilities
(`bg-surface`, `text-muted-foreground`, `bg-primary`) — **hardcoded colors are a
review blocker** (AGENTS.md rule #4). Colors are authored in `oklch` for smooth,
perceptually-even light/dark ramps.

- `:root, .light` — light palette. `.dark` — dark palette.
- Dark mode: `next-themes` toggles a `.dark` class on `<html>`, seeded from
  `prefers-color-scheme`, overridable by the manual `ThemeToggle`.
- `.light` mirrors `:root` so a subtree can be pinned to light if ever needed.
- shadcn aliases (`--card`, `--popover`) point at our surface tokens so canonical
  `npx shadcn add …` output drops in without edits.

All colored badges/buttons use **solid** fills (not translucent tints): their
contrast is deterministic and verified AA in both themes by the axe e2e.

## Components

**Primitives** (`components/ui/*`) are shadcn/ui, copied via the CLI and adapted:
default/lg/icon sizes are ≥44px tap targets; Badge gained `success`/`warning`
variants; Input is `h-11`. `asChild` composition uses `@radix-ui/react-slot`.

**Product components** (`components/*`) are the Phase 1 kit: `SectionTile`,
`StepCard`, `ChecklistItem` (built on the Radix `Checkbox`), `DeadlineBadge`
(urgency from the pure `lib/deadline.ts`), `SearchBar`, `BottomNav`, `EmptyState`,
plus `ThemeToggle` and `SiteBottomNav`. Content-bearing components take strings as
props (content is data); chrome strings come from next-intl dictionaries.

## i18n

Single-locale setup for now: `i18n/request.ts` returns locale `ru` and its
messages; `next.config.ts` wires the next-intl plugin. Server components read
translations via `getTranslations`; client components via `useTranslations` under
the `NextIntlClientProvider` mounted in the root layout. Plural-aware strings use
ICU syntax (e.g. deadline countdowns). Locale routing (`/[locale]`) and the EN
switch are deferred to a later phase.

## Rendering & performance

Both routes are statically prerendered. Lucide icon components can't cross the
server/client boundary as props, so nav that needs icons lives in small client
wrappers (`SiteBottomNav`). Placeholder links use `prefetch={false}` until their
routes exist. See `docs/PHASE_REPORTS/phase-1.md` for the JS-budget note.

## CI

`.github/workflows/ci.yml`: `verify` (lint → typecheck → unit+coverage → build),
then `e2e` (Playwright + axe) and `lighthouse` in parallel. Vercel builds PR
previews independently.
