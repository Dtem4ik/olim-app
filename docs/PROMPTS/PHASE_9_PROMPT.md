# Phase 9 kickoff prompt (REDEFINED — launch prep, NOT app stores)

Phase 9 was originally "Capacitor + app stores". Decision by the owner: app stores are deferred (Apple $99/yr, Google $25, slow review) — the web + PWA covers the launch. Phase 9 is now **launch readiness**: a PWA install prompt + the code-side items of the launch gate. Store packaging becomes a later, optional "Phase 11".

Copy everything below into a new Claude Code session started in this folder.

---

You are the executor of Phase 9 (launch prep) of the Olim App project. Read `AGENTS.md` (hard rules, Known traps, docs-sweep), `docs/ROADMAP.md`, `docs/LAUNCH_CHECKLIST.md`, `docs/PHASE_REPORTS/phase-8.md`. Work STRICTLY within this scope. The dashboard/env items in the launch checklist (PostHog/Sentry/Gemini keys, Supabase Auth URLs, cron) are the OWNER's manual steps — do not attempt them; make the CODE ready for them.

Language policy: repository is English; chat in Russian; user-facing strings via next-intl dictionaries.

## 9-0 — BUG FIX FIRST (production bug found by the owner)

The onboarding quiz shows "нет шагов" on its result screen, but the home page then shows the real plan. Root cause: `app/onboarding/page.tsx` still loads `content/fixtures` (the ~5 committed demo steps, a Phase-4 stub — see its comment "real Supabase wiring is Phase 4") instead of the real content. The quiz computes `buildPlan` over 5 fixtures → nothing matches the answers → empty; home reads the full 111 steps via `lib/content/repo.ts` → correct. Fix: load onboarding steps through the same content repo (`repo`: Supabase → fixtures fallback) that home/guides use, so the preview matches the real plan. Add a regression test (quiz completion yields the same non-empty plan the home would). **Verify against the FULL content (local stack seeded with all 111 steps via `content:import`, not the 5 fixtures)** — a "fix" that only passes on fixtures is not verified. Commit this first, atomically.

## 9a-bis — Analytics fine-tuning (from owner concerns)

- **Session Replay** (owner wants it): enable PostHog session replay BUT with privacy + performance care — mask all text inputs and the city/dates/free-text fields (never record PII), sample at a modest rate (e.g. 10–20%, not 100%), lazy-load so it never blocks first paint. Document the masking + sample rate in ARCHITECTURE.
- **Speed guard (owner's hard requirement — the site must NOT get slower):** confirm PostHog/Sentry load `afterInteractive` (never render-blocking), and prove via the Lighthouse CI gate that Performance did not regress on Home/search with analytics enabled. Report the before/after perf numbers. If replay drags perf below gate, lower the sample rate.

## 9a — PWA install prompt ("добавить как приложение")

- A tasteful, dismissible **install prompt** that appears as a bottom sheet/drawer (reuse the redesign's `BottomSheet` for visual consistency) inviting the user to add the app to their home screen.
- **Android/Chrome:** capture the `beforeinstallprompt` event, show our own sheet, call `prompt()` on accept. **iOS/Safari** (no native API): show illustrated instructions ("Поделиться → На экран «Домой»") since iOS can't trigger programmatically — detect iOS Safari and branch the copy.
- Frequency discipline: show once, remember dismissal in localStorage (versioned key), never nag; don't show if already installed (`display-mode: standalone`) or already dismissed. A manual "Установить приложение" entry also lives on the Profile screen.
- RU/EN strings; a11y (focus, Escape, both themes); e2e that the sheet shows once and respects dismissal (mock the event).

## 9b — Trust & safety surface (content-safety, code side)

- Ensure the **"не юридическая консультация — проверяйте по официальному источнику"** disclaimer is on the STEP CARD trust footer (not only the AI box). Short, calm, always visible where a deadline/sum is shown.
- A lightweight `/about` (or Profile section): what the app is, that it's free and independent, sources it draws from (gov.il / Kol Zchut / Bituach Leumi / Nativ), the not-legal-advice note, and a feedback contact (email or Telegram — ask the owner which). Indexable, SSR, RU.

## 9c — Eval set expansion for the grown corpus

- The corpus grew to 16 sections / 111 steps but `evals/questions.json` only covers the original topics. Add ~10–15 RU questions spanning the new sections (pets, documents-and-status, safety-and-emergency, taxes-pension-social, children-and-school, work benefits) including at least 3 "dangerous" ones (specific new sums/deadlines) and 2 out-of-scope. Re-run `pnpm eval`; the gate (≥90%, 0 fabricated, 0 contradicted) must hold on the expanded set. Commit the eval transcript.

## 9d — Analytics wiring sanity (code side only)

- Confirm the env-gated PostHog/Sentry facade emits the launch-relevant events end-to-end: `quiz_completed`, `step_done`, `plan_shared`, `search_performed`, `ai_answered`, `report_outdated`, plus a new `install_prompt_shown` / `install_accepted`. No keys in this session — just verify the events fire (unit/e2e with the facade) so that when the owner adds keys, data flows. Document the event catalogue in `docs/ARCHITECTURE.md`.

## 9e — Prod sign-in verification (launch gate, owner-assisted)

- Auth on prod is a launch gate. The OWNER has set the Supabase Auth URL config + Google provider; this session's job: verify the CODE path end-to-end and give the owner a short checklist to confirm on the live https site (magic-link AND Google both complete → land signed-in → plan syncs). Add an e2e that covers the callback route. Record in LAUNCH_CHECKLIST which items are confirmed vs still owner-manual.

## DoD

- Onboarding bug fixed and verified against full content (not fixtures).
- Install prompt: shows once on Android (mocked event) with accept/dismiss, iOS instructions branch, Profile manual entry, never nags; e2e + axe both themes.
- Disclaimer on step cards; `/about` page SSR + indexable.
- Eval green on the expanded set (transcript committed).
- Event catalogue documented; facade emits all launch events (tested).
- Lighthouse/JS gates hold; docs sweep (README status, ROADMAP reframe of Phase 9, LAUNCH_CHECKLIST ticks for code-side items).

Finish: `docs/PHASE_REPORTS/phase-9.md` — done / deferred / debts / verification / screenshots (install sheet Android + iOS instructions, /about, step-card disclaimer) / updated eval scores. Note which launch-checklist items remain OWNER-manual.
