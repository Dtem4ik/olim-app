# Phase 5.5 — native-mobile UI redesign (off-roadmap, user-led)

Status: **complete, merged** (PR #7, `redesign/native-mobile-ui` → `main`, commit `339fc27`). Backup branch with the experimental history: `redesign-backup`.

An off-roadmap redesign performed by the project owner between Phases 5 and 6: the UI was taken from "AI-assembled website" to a native-mobile look per the product reference. Logic and data unchanged, except one new DB field (below).

## Scope

- **Home** — photo hero (Tel Aviv), personalized photo tiles for sections (zero-step sections hidden), "Твои разделы" heading, loading skeletons.
- **Guides / Section / Step** — color photo section cards; a section shows the WHOLE guide with the user's matched steps grouped on top ("Твои шаги"); tapping a step raises a **bottom sheet** (pure-CSS: swipe / backdrop / Escape). Deep links open the section with the sheet already raised; step content is **SSR** (SEO) with its own `<title>`/`description` and dynamic `<h1>`; URL stays in sync; smart back button.
- **Plan / Profile / Onboarding / Shared plan / Offline** — aligned to the new language (stat tiles, avatar header, photo intro, animated checklist).
- **Search** — new `/search` screen shell with autofocus and query restore on back-nav (real FTS lands in Phase 6).
- **Navigation** — floating pill nav moved to the shared layout (fixed bottom, active item by URL).
- **Animations** — clean fades, springy checkbox, animated strikethrough; all respect `prefers-reduced-motion`.

## Verification (CI green on PR #7)

lint ✓ · typecheck ✓ · 188 unit ✓ · build ✓ · e2e + axe (both themes, 0 critical/serious) ✓ · Lighthouse hard gates (perf ≥90 / a11y ≥95) on all routes ✓ · Vercel preview ✓. Real bugs fixed along the way: a hydration error (`<button>` inside `<button>`) and a wrong deadline assert format in e2e.

## The animation-vs-CI saga (recorded as Known traps in AGENTS.md)

- **Lighthouse `NO_FCP`**: a backgrounded audit tab freezes the entry animation on its first frame; at `opacity: 0` the page counts as unpainted. Fix: start the fade at `opacity: 0.01` (visually identical, counts as paint).
- **axe false contrast failures**: axe sampled colors mid-fade where muted text is semi-transparent. Fix: shared `tests/e2e/settle.ts` (`settleAnimations`) disables animations before axe runs.
- "Fix-by-poking" cosmetics were reverted: muted text color and animation durations returned to the original design values (they passed AA all along). The only app-code change vs. the initial redesign is the `opacity: 0.01` keyframe.

## Database

One additive field: `public.sections.image_url text` (nullable), migration `20260716120000_add_section_image_url.sql` (idempotent `ADD COLUMN IF NOT EXISTS`), threaded through zod schema, repo, import, generated types. **Applied to the prod remote** following AGENTS rule 7: `pg_dump -n portfolio` snapshot taken first (v17 tooling via `postgres:17` Docker image; 141 KB, 8 tables; stored outside the repo). `portfolio` schema untouched.

## Images

Section/hero photos sourced from **Unsplash** (license permits use without attribution), converted to **webp** and **self-hosted** in the app — no hotlinking. Details/inventory: `docs/IMAGES.md` (created in Phase 6 housekeeping).

## Design decisions of record

- **Bottom sheet: custom vs registry `Drawer`.** The shadcn registry Drawer (Base UI, formerly vaul) was reviewed. Custom retained deliberately: the deep-link scenario (sheet opened from a URL with no trigger mounted) requires manual focus management in either implementation — a known vaul edge case per the 2026 registry a11y audit. Parity checklist owed: focus trap inside the open sheet, focus return on close, body scroll lock on iOS, swipe physics on a real device.

## Debts (non-blocking)

1. `/dev/ui` showcase partially stale (dev-only).
2. Minor card-radius inconsistency across screens.
3. Local macOS-arm64 prod build (`pnpm build && pnpm start`) mis-colors `<a>`/`<button>` (Tailwind oxide `@layer` ordering); dev/CI/prod-deploy unaffected. Watch for the `@tailwindcss/oxide` patch.
4. Roadmap deltas: Phase 6a targets the existing `/search` shell; 6b builds on the SSR step sheets; Phase 9's Apple 4.2 case is strengthened by the app-like UI.
