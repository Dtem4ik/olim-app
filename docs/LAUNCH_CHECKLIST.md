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
- [ ] **(OWNER)** Verify PostHog events: open prod, do a quiz, check the event shows up in PostHog Live Events.
- [ ] **(OWNER)** Verify Sentry ingestion (Phase 10, B2): open **`/dev/sentry-check` on a PREVIEW deploy** (the route 404s on production by design), click "Send a test error", then confirm the issue appears in Sentry → Issues within a minute.
- [ ] **(OWNER)** Verify session replay (Phase 10, B2): in PostHog → **Session Replay**, open a recent recording and confirm (a) recordings exist and (b) every input (city, dates, children ages, free-text) is **masked** — the app sets `maskAllInputs`. Recording is sampled at ~15% per session; the **single lever** is `SESSION_REPLAY_SAMPLE_RATE` in `lib/session-replay.ts` (not a PostHog dashboard toggle) — change it there and redeploy to adjust volume.

## Priority 3 — Working sign-in + AI on prod (две главные фичи после контента)

> **Auth code path is verified (Phase 9e):** the `/auth/callback` route exchanges
> the code and bounces to the app; the localStorage plan is migrated by
> SyncProvider/`bootstrapSync` from the session cookies on the next load. The
> `?next` param is guarded against open redirects (unit-tested), and an e2e covers
> the callback error path. The two boxes below are the remaining OWNER dashboard
> steps; after them, do the phone test.

- [ ] **(OWNER)** Supabase → Auth → URL Configuration: Site URL = `https://olimguide.online`; Redirect URLs include `https://olimguide.online/**` (the old `https://olim-app.vercel.app/**` entries stay — that host now 308-redirects to the custom domain, 2026-10-09). (Without this magic-link and Google sign-in are rejected on prod.)

#### Resend as the Auth SMTP provider — unblocks the RU sign-in email AND real sending volume

> **Why this matters (blocked without it):** Supabase refuses to edit the magic-link
> template unless you use custom SMTP, so the RU sign-in email is impossible on the
> built-in sender; and the built-in sender is rate-limited to a few emails/hour —
> unusable past a handful of friends. Wiring Resend fixes both at once.

- [ ] **(OWNER)** Resend → create an account, add & verify a sending domain (DNS: SPF + DKIM records). A `.com`/`.app` domain (or a subdomain of an established domain) has far better deliverability than a cheap `.space`/`.top` TLD — see the domain caution in Priority 6.
- [ ] **(OWNER)** Resend → API Keys → create a key with **Sending access**. (This same key doubles as the Edge Function `RESEND_API_KEY` below.)
- [ ] **(OWNER)** Supabase → Project Settings → Authentication → SMTP Settings → **Enable custom SMTP** with: Host `smtp.resend.com`, Port `465`, Username `resend`, Password = the Resend API key, Sender email = `no-reply@<your-domain>`, Sender name = `Olim App`.
- [ ] **(OWNER)** Supabase → Auth → Email Templates → Magic Link: paste the RU template (from `supabase/templates/magic_link.html`) and subject `Ваша ссылка для входа в Olim App`. (Editing the template is only allowed once custom SMTP is on.)
- [ ] **(OWNER)** Verify: request a magic link on prod → a **Russian** sign-in email arrives from your domain (not `noreply@mail.app.supabase.io`).

#### Reminder cron — schedule already lives in the repo, only secrets are manual

> **Code-complete (Phase 10, A1):** the daily schedule is an additive migration
> (`supabase/migrations/20260726120000_schedule_reminders_cron.sql`) using
> `pg_cron` + `pg_net`. It reads the function URL and service key from **Vault at
> run time**, so no secret is committed and it is a clean no-op until the two
> secrets below exist. The function already dry-runs safely without `RESEND_API_KEY`.

- [ ] **(OWNER)** Supabase → Edge Functions → Secrets → set `RESEND_API_KEY` (the same Resend key as above). Optionally set `REMINDER_FROM_EMAIL` = `Olim App <no-reply@your-domain>` and `SITE_URL` = the prod URL (defaults are safe). Without `RESEND_API_KEY` the function claims + logs but never sends (dry-run).
- [ ] **(OWNER)** Supabase → Project Settings → Vault → add two secrets so the scheduled cron can reach the function:
  - `send_reminders_url` = `https://<project-ref>.supabase.co/functions/v1/send-reminders`
  - `service_role_key` = the project's `service_role` key (Project Settings → API).
- [ ] **(OWNER)** Verify the cron is live: `select jobname, schedule, active from cron.job;` should list `send-reminders-daily` (`0 6 * * *`). To test immediately without waiting for 06:00 UTC, run the migration's `net.http_post` body once by hand (SQL editor) — a reminder email should land for any opted-in user with an upcoming deadline.
- [ ] **(OWNER)** Vercel env: add `GEMINI_API_KEY` (server-side) → Redeploy. Verify `/search` AI answer works on prod (not the "AI-ответы скоро" fallback).
- [ ] **(OWNER)** Phone test / sign-in gate: on the live https site — (1) magic-link → land signed-in; (2) Google → land signed-in; (3) an anonymous plan created before sign-in survives and syncs (open it on a second device); (4) ask the AI a question; (5) check a step; (6) share your plan and open the Telegram unfurl.

## Domain day — attach the custom domain (a 15-minute, 3-step change)

> **Code-complete (Phase 10, B0):** every server-rendered absolute URL (canonical,
> `sitemap.xml`, `robots.txt`, OG image URLs, JSON-LD) is built from ONE resolver
> (`lib/site-url.ts`); client links (share, `/plan/{slug}`, auth callback) use
> `window.location.origin` and follow the domain automatically. So the swap is
> **one variable**, not a codebase hunt. The product NAME stays "Olim" — nothing is
> renamed.

- [ ] **(OWNER)** Vercel → olim-app → Settings → Domains: add the domain; then Settings → Environment Variables → set `NEXT_PUBLIC_SITE_URL=https://your-domain` (Production) → Redeploy.
- [ ] **(OWNER)** Supabase → Auth → URL Configuration: change Site URL to `https://your-domain` and add `https://your-domain/auth/callback` to Redirect URLs (else magic-link / Google sign-in break on the new host).
- [ ] **(OWNER)** Resend → verify the sending domain (add its SPF + DKIM DNS records) and set the reminder Edge Function secret `SITE_URL=https://your-domain` (`supabase secrets set SITE_URL=…`) so reminder deep links point at the domain.
- [ ] **(OWNER, if using a cheap TLD)** Prefer `.com`/`.app` (or send email from a subdomain of an established domain): magic-link + reminder deliverability is materially worse from `.space`/`.top`-style TLDs — they land in spam far more often.

## Priority 4 — Soft launch (узкий круг)

- [ ] Send the link to 5–10 friends/acquaintances who made aliyah (or are about to). Ask: "что непонятно? чего не хватило? что бесит?"
- [ ] Watch PostHog: где отваливаются в квизе, что ищут и не находят, что спрашивают у ИИ.
- [ ] Fix the top 3 friction points found. Add missing content the searches revealed.

## Priority 5 — Wide launch (чаты олим)

- [ ] Post in 5–7 olim Telegram/Facebook groups — as HELP answering a real question, not an ad. "Сделал бесплатный навигатор адаптации, вот ссылка" + a vc.ru/Habr build-in-public post.
- [ ] Submit sitemap to Google Search Console (SEO from Phase 6 starts earning).
- [ ] Monitor Sentry for real-device crashes; bugfix sprint.

## Priority 6 — Later, NOT a launch gate

- [ ] **Web Push (VAPID) as Phase 11 — the best post-MVP candidate.** Works on Android and on iOS 16.4+ when the PWA is installed to the home screen; free, no Apple Developer fee. Two real wins: a deadline reminder is far more visible than an email, and **a push subscription needs no account**, so reminders finally reach anonymous users too (today they require sign-in for the email). Scope: SW push handler (serwist SW exists), VAPID keys, a subscriptions table + RLS, sending from the existing `send-reminders` Edge Function via a Deno web-push lib, permission UX gated behind a user gesture (and behind install on iOS), unsubscribe, and pruning dead subscriptions on 410. Keep email as the baseline channel — the iOS install→permission funnel converts only a few percent; extend `reminder_log` with a channel column so the two never double-send. Requires a real-iPhone test loop, which is exactly why it stays out of the zero-debt closure phase.
- [ ] App stores via Capacitor (Phase 9-original) — only after the web version shows demand and the $99/yr Apple fee is justified. Note: once Web Push lands, the main reason to go native disappears.
- [ ] Standing content cadence (a content session per sprint) — content is now the main growth axis.
- [ ] Quiz vocabulary gaps: age/pension dimension, pregnancy/gender dimension.
