# Privacy notes

Olim App is **anonymous-first**. An account is never required for the core flows
(quiz, plan, guides, search, sharing). This note documents what data exists, where
it lives, and how deletion works. It is an engineering reference, not the
user-facing policy.

## What we store

| Data | Where | Scope / access |
|---|---|---|
| Quiz answers + checked steps (anonymous) | the device's `localStorage` only | never leaves the device unless the person shares or signs in |
| Shared plans | `public.plans` rows (anonymous, `user_id` null) | **sanitized** snapshot — only the `cond`-relevant answers; **no city, no dates, no free text**. Reachable only via an unguessable share slug (nanoid ≥16) through a `SECURITY DEFINER` RPC |
| Account state (signed-in) | `public.user_state` (one row per user) | the full profile answers (incl. city/arrival dates), checked steps, and reminder prefs. **Owner-only** via RLS (`user_id = auth.uid()`) |
| Account identity | `auth.users` (Supabase Auth) | email (magic link) or Google profile email. Managed by Supabase Auth |
| Reminder send log | `public.reminder_log` (Phase 7b) | `(user_id, step_slug, threshold_days)` + sent timestamp, for idempotency. Owner-readable; written by the service role |

Signing in adds exactly two things: **cross-device sync** and **deadline
reminders**. Nothing else changes.

## Deadline reminders (opt-in)

Reminders are **off by default**. When enabled, the person's email is used only to
send deadline emails. Every email carries a **one-click unsubscribe** link
(`/api/reminders/unsubscribe?token=…`, an unguessable per-user token) that turns
reminders off **without logging in**.

## Account deletion

Profile → *Delete account* removes the account end-to-end:

- the **`auth.users`** row is hard-deleted (Supabase Auth admin API);
- **`user_state`** is removed automatically (`ON DELETE CASCADE`);
- the **reminder log** rows are removed automatically (`ON DELETE CASCADE`);
- any **owned share-plans** are **disassociated** (`plans.user_id` → `NULL`,
  `ON DELETE SET NULL`) rather than deleted. They hold no personal data (see the
  sanitization above) and stay reachable only by their unguessable slug, so
  whoever the person already shared a link with keeps a working link.

The device's **local cache is intentionally kept** — the app keeps working
anonymously right after deletion.

## Retention

- Anonymous share-plans persist indefinitely (they contain no PII). A TTL/cleanup
  job is a possible future addition, not implemented now.
- Local cache lives on the device until the person taps *Reset everything* or
  clears site data.

## Third parties (data processors)

- **Supabase** — Postgres, Auth, and (Phase 7b) the reminder Edge Function.
- **Resend** — transactional email delivery for reminders only (Phase 7b).

The Supabase project is shared with the portfolio site (dtem4ik.dev); Olim App
owns the `public` schema only and never reads or writes the `portfolio` schema.
