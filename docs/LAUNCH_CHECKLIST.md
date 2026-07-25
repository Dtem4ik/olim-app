# Launch checklist — Olim App

Ordered by priority. Do NOT share the link with anyone (even friends) until Priority 1–3 are done.
App stores (Capacitor) are deliberately OUT of scope for launch: Apple costs $99/year, Google Play $25 one-time, and Apple review is slow/fussy — the web + PWA "add to home screen" covers ~90% of the value for $0. Revisit stores only after the web version proves demand.

---

## Priority 1 — Content safety (без этого нельзя постить вообще)

The gate that protects real people from acting on a wrong date/sum.

- [ ] **(OWNER)** Editorial spot-check of the ~10–15 highest-risk steps — the ones with a concrete deadline or amount: kupat holim (90 days), driver's licence exchange (1 year), sal klita (absorption basket), child allowance, tax points. Open each step's `source_url`, confirm the number/deadline matches. (Not all 111 steps — just the dangerous ones.)
- [x] **(CODE — Phase 9)** "Не юридическая консультация — проверяйте по официальному источнику" disclaimer visible on the STEP CARD (the trust footer), not only in the AI ask box.
- [x] **(CODE — Phase 9)** AI eval still green after the content grew to 111 steps: added 15 questions covering the new topics (pets, documents, safety, taxes, children, work benefits) to `evals/questions.json` (66 total), re-ran `pnpm eval` — **63/66 = 95.5%, 0 fabricated, 0 contradicted** (transcript `assets/phase-9/eval-run.txt`).

## Priority 2 — Analytics (без неё запуск слепой)

"Пользователи без аналитики — пустота." Set this up BEFORE even the soft launch, so the first 10 friends already count.

> **Code side is ready (Phase 9):** the env-gated facade emits the full launch
> event catalogue (`quiz_completed`, `step_done`, `plan_shared`, `search_performed`,
> `ai_answered`, `report_outdated`, `install_prompt_shown`, `install_accepted`) —
> verified through tests — and PostHog session replay is PII-masked + sampled (~15%,
> lazy). Events flow the moment the owner adds the key. See ARCHITECTURE → Analytics.

- [ ] **(OWNER)** PostHog: create a free project at posthog.com → copy the Project API Key.
- [ ] **(OWNER)** Sentry: create a free project at sentry.io (Next.js) → copy the DSN.
- [ ] **(OWNER)** Vercel → olim-app → Settings → Environment Variables → add `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (usually `https://eu.i.posthog.com`), `NEXT_PUBLIC_SENTRY_DSN` → Redeploy.
- [ ] **(OWNER)** Verify: open prod, do a quiz, check the event shows up in PostHog Live Events. (Enable session replay + set the sample rate in the PostHog project settings if needed; the client already masks inputs.)

## Priority 3 — Working sign-in + AI on prod (две главные фичи после контента)

> **Auth code path is verified (Phase 9e):** the `/auth/callback` route exchanges
> the code and bounces to the app; the localStorage plan is migrated by
> SyncProvider/`bootstrapSync` from the session cookies on the next load. The
> `?next` param is guarded against open redirects (unit-tested), and an e2e covers
> the callback error path. The two boxes below are the remaining OWNER dashboard
> steps; after them, do the phone test.

- [ ] **(OWNER)** Supabase → Auth → URL Configuration: Site URL = `https://olim-app.vercel.app`; add `https://olim-app.vercel.app/auth/callback` to Redirect URLs. (Without this magic-link and Google sign-in are rejected on prod.)
- [ ] **(OWNER)** Supabase → Auth → Email Templates → Magic Link: paste the RU template (from `supabase/templates/magic_link.html`).
- [ ] **(OWNER)** Supabase → Edge Functions → set `RESEND_API_KEY` secret; schedule the `send-reminders` cron (dashboard Cron or pg_cron, once daily). Test: a reminder email lands in your inbox.
- [ ] **(OWNER)** Vercel env: add `GEMINI_API_KEY` (server-side) → Redeploy. Verify `/search` AI answer works on prod (not the "AI-ответы скоро" fallback).
- [ ] **(OWNER)** Phone test / sign-in gate: on the live https site — (1) magic-link → land signed-in; (2) Google → land signed-in; (3) an anonymous plan created before sign-in survives and syncs (open it on a second device); (4) ask the AI a question; (5) check a step; (6) share your plan and open the Telegram unfurl.

## Priority 4 — Soft launch (узкий круг)

- [ ] Send the link to 5–10 friends/acquaintances who made aliyah (or are about to). Ask: "что непонятно? чего не хватило? что бесит?"
- [ ] Watch PostHog: где отваливаются в квизе, что ищут и не находят, что спрашивают у ИИ.
- [ ] Fix the top 3 friction points found. Add missing content the searches revealed.

## Priority 5 — Wide launch (чаты олим)

- [ ] Post in 5–7 olim Telegram/Facebook groups — as HELP answering a real question, not an ad. "Сделал бесплатный навигатор адаптации, вот ссылка" + a vc.ru/Habr build-in-public post.
- [ ] Submit sitemap to Google Search Console (SEO from Phase 6 starts earning).
- [ ] Monitor Sentry for real-device crashes; bugfix sprint.

## Priority 6 — Later, NOT a launch gate

- [ ] App stores via Capacitor (Phase 9-original) — only after the web version shows demand and the $99/yr Apple fee is justified.
- [ ] Standing content cadence (a content session per sprint) — content is now the main growth axis.
- [ ] Quiz vocabulary gaps: age/pension dimension, pregnancy/gender dimension.
