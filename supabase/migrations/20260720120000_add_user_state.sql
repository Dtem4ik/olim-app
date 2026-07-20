-- Olim App — account user-state (Phase 7a) + reminder settings (7b).
--
-- Scope: ADDITIVE, entirely in the `public` schema. The Supabase project is
-- shared with the portfolio site (`portfolio` schema); nothing here references,
-- alters, or grants on it. See AGENTS.md rules 6 & 7.
--
-- Storage-model decision (justified in docs/ARCHITECTURE.md): the canonical,
-- synced account state is a SINGLE row per user in a NEW `user_state` table —
-- NOT an overload of `plans`. `plans` are ephemeral, publicly-readable-by-slug,
-- deliberately sanitized SHARE snapshots (many per person, no city/dates); the
-- account's live state (full profile answers, checked steps, reminder prefs) has
-- a different lifecycle and privacy model (owner-only). Keeping them separate
-- preserves the `plans = public share snapshot` invariant.
--
-- Objects created (all in public):
--   tables: user_state
--   RLS:    owner-scoped read/insert/update/delete (authenticated only)
--
-- Account deletion: `user_id references auth.users on delete cascade`, so
-- removing the auth user drops this row. Owned `plans` keep their existing
-- `on delete set null` (share links survive, disassociated — they hold no PII;
-- documented in docs/PRIVACY.md).

-- ---------------------------------------------------------------------------
-- user_state — one row per signed-in user: their synced plan + reminder prefs.
-- ---------------------------------------------------------------------------
create table public.user_state (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  -- The onboarding profile (localStorage `olim.profile.v1`), migrated on first
  -- sign-in and written through on change. Owner-only, so city/dates are fine.
  answers            jsonb not null default '{}'::jsonb,
  -- Checked step slugs (localStorage `olim.progress.v1`).
  done_step_ids      jsonb not null default '[]'::jsonb,
  -- Deadline reminders (Phase 7b): opt-in, off by default; lead time 30/14/7.
  reminders_enabled  boolean not null default false,
  reminder_lead_days integer not null default 14,
  -- One-click unsubscribe token (no login): the reminder email links to
  -- /api/reminders/unsubscribe?token=… which flips reminders_enabled off.
  -- Unguessable (uuid) and rotatable without touching the auth user.
  unsubscribe_token  uuid not null default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint user_state_answers_is_object check (jsonb_typeof(answers) = 'object'),
  constraint user_state_done_is_array check (jsonb_typeof(done_step_ids) = 'array'),
  constraint user_state_lead_days_check check (reminder_lead_days in (7, 14, 30))
);

-- Cron reminder job scans only opted-in users.
create index user_state_reminders_idx on public.user_state (user_id) where reminders_enabled;
-- Unsubscribe lookup by token.
create unique index user_state_unsubscribe_token_idx on public.user_state (unsubscribe_token);

create trigger user_state_set_updated_at
  before update on public.user_state
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants — new-table auto-exposure is disabled, so grant explicitly; RLS below
-- narrows to the owner. anon gets nothing (account state requires sign-in).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.user_state to authenticated;
grant select, insert, update, delete on public.user_state to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-scoped, authenticated only.
-- ---------------------------------------------------------------------------
alter table public.user_state enable row level security;

create policy "owners can read their state"
  on public.user_state for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "owners can create their state"
  on public.user_state for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "owners can update their state"
  on public.user_state for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "owners can delete their state"
  on public.user_state for delete
  to authenticated
  using (user_id = (select auth.uid()));
