-- Olim App — deadline-reminder send log (Phase 7b).
--
-- ADDITIVE, `public`-only. Idempotency for the reminder Edge Function: a unique
-- (user_id, step_slug, threshold_days) means a reminder can never fire twice for
-- the same step + lead-time window. Written by the service role (cron); readable
-- by the owner. Cascades on account deletion. See AGENTS.md rules 6 & 7.

create table public.reminder_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  step_slug      text not null,
  threshold_days integer not null,
  sent_at        timestamptz not null default now(),
  constraint reminder_log_unique unique (user_id, step_slug, threshold_days)
);

create index reminder_log_user_idx on public.reminder_log (user_id);

grant select on public.reminder_log to authenticated;
grant select, insert, delete on public.reminder_log to service_role;

alter table public.reminder_log enable row level security;

create policy "owners can read their reminder log"
  on public.reminder_log for select
  to authenticated
  using (user_id = (select auth.uid()));
