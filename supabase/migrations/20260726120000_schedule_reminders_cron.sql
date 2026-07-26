-- Olim App — schedule the deadline-reminder cron in the repo (Phase 10, A1).
--
-- ADDITIVE, `public`-adjacent (uses the `cron`/`net`/`vault` schemas only; does
-- NOT touch `portfolio` — AGENTS.md rules 6 & 7). This makes the daily
-- `send-reminders` run reproducible from the repo instead of a hand-clicked
-- dashboard Cron: the schedule now travels with the migrations.
--
-- HOW IT WORKS
--   pg_cron fires daily and pg_net POSTs to the Edge Function URL with the
--   service-role key as a bearer token. Both the URL and the key are read from
--   Vault AT RUN TIME by name, so no project-specific URL or secret is ever
--   committed. If those Vault secrets are absent (e.g. a fresh local stack, or
--   before the owner sets them on prod), the `FROM` yields zero rows and
--   net.http_post is simply never called — a clean no-op, never an error.
--
-- OWNER STEPS to activate on prod (documented in docs/LAUNCH_CHECKLIST.md):
--   1. Create two Vault secrets (Dashboard → Project Settings → Vault):
--        send_reminders_url = https://<project-ref>.supabase.co/functions/v1/send-reminders
--        service_role_key   = <the project's service_role key>
--   2. Set the Edge Function secret RESEND_API_KEY (else the function dry-runs).
--   After that the schedule below fires with no further code change.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- cron.schedule(name, schedule, command) upserts by job name (pg_cron ≥ 1.4),
-- so re-running this migration re-points the same job rather than duplicating.
-- 06:00 UTC daily ≈ 08:00–09:00 in Israel — a morning nudge, not a 3am ping.
select cron.schedule(
  'send-reminders-daily',
  '0 6 * * *',
  $cmd$
  select net.http_post(
    url     := url_secret.decrypted_secret,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || key_secret.decrypted_secret
    ),
    body    := '{}'::jsonb
  )
  from vault.decrypted_secrets as url_secret,
       vault.decrypted_secrets as key_secret
  where url_secret.name = 'send_reminders_url'
    and key_secret.name = 'service_role_key';
  $cmd$
);
