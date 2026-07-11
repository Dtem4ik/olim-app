-- Olim App — initial content schema (Phase 2a).
--
-- Scope: this migration is ADDITIVE and lives ENTIRELY in the `public` schema.
-- The Supabase project is shared with the portfolio site, whose data lives in the
-- separate `portfolio` schema. Nothing here references, alters, or grants on
-- `portfolio`. See AGENTS.md rules 6 & 7.
--
-- Objects created (all in public):
--   functions: public.set_updated_at(), public.get_plan_by_share_slug(text)
--   tables:    sections, steps, benefits, plans, step_reports
--   RLS:       public read on content tables; insert-only step_reports;
--              plans owner-scoped + slug read via SECURITY DEFINER function.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Keep `updated_at` fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- sections — top-level guide sections (banks, rent, healthcare, ...)
-- ---------------------------------------------------------------------------
create table public.sections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text,
  icon        text,                       -- lucide icon name
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sections_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint sections_title_len check (char_length(title) between 1 and 120)
);

create index sections_sort_order_idx on public.sections (sort_order);

create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- steps — individual guide steps within a section
-- ---------------------------------------------------------------------------
create table public.steps (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  section_slug    text not null references public.sections (slug) on update cascade on delete cascade,
  title           text not null,
  summary         text,                   -- short answer, shown first
  body_md         text not null,          -- markdown body (the actual steps)
  docs            jsonb not null default '[]'::jsonb,  -- "bring with you" documents
  warn_rule       jsonb,                  -- deadline warning rule (nullable)
  tips            jsonb not null default '[]'::jsonb,  -- community tips
  cond            jsonb not null default '{}'::jsonb,  -- personalization conditions
  stage           text,                   -- lifecycle stage for ordering
  source_url      text not null,
  last_verified_at date not null,
  needs_review    boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint steps_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint steps_title_len check (char_length(title) between 1 and 160),
  constraint steps_summary_len check (summary is null or char_length(summary) <= 400),
  constraint steps_body_len check (char_length(body_md) between 1 and 8000),
  constraint steps_source_url_https check (source_url ~ '^https://'),
  constraint steps_docs_is_array check (jsonb_typeof(docs) = 'array'),
  constraint steps_tips_is_array check (jsonb_typeof(tips) = 'array'),
  constraint steps_cond_is_object check (jsonb_typeof(cond) = 'object'),
  constraint steps_warn_rule_is_object check (warn_rule is null or jsonb_typeof(warn_rule) = 'object')
);

create index steps_section_slug_idx on public.steps (section_slug);
create index steps_sort_order_idx on public.steps (section_slug, sort_order);
create index steps_needs_review_idx on public.steps (needs_review);
create index steps_cond_idx on public.steps using gin (cond);

create trigger steps_set_updated_at
  before update on public.steps
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- benefits — dated amount tables (sal klita, etc.). Never inlined in step text.
-- ---------------------------------------------------------------------------
create table public.benefits (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null,
  title           text not null,
  amount          numeric(12, 2),
  currency        text not null default 'ILS',
  unit            text,                   -- 'month' | 'one-time' | ...
  valid_from      date not null,
  valid_to        date,
  source_url      text not null,
  last_verified_at date not null,
  notes           text,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint benefits_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint benefits_source_url_https check (source_url ~ '^https://'),
  constraint benefits_currency_len check (char_length(currency) = 3),
  constraint benefits_meta_is_object check (jsonb_typeof(meta) = 'object'),
  constraint benefits_valid_range check (valid_to is null or valid_to >= valid_from),
  -- one row per benefit per effective date (dated versions coexist)
  constraint benefits_slug_valid_from_unique unique (slug, valid_from)
);

create index benefits_slug_idx on public.benefits (slug);

create trigger benefits_set_updated_at
  before update on public.benefits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plans — a person's trackable plan. Anonymous (user_id null) or account-owned.
-- ---------------------------------------------------------------------------
create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  share_slug    text not null unique,
  answers       jsonb not null default '{}'::jsonb,
  done_step_ids jsonb not null default '[]'::jsonb,
  user_id       uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- unguessable share slug: nanoid, at least 12 chars (AGENTS.md security bar)
  constraint plans_share_slug_len check (char_length(share_slug) >= 12),
  constraint plans_answers_is_object check (jsonb_typeof(answers) = 'object'),
  constraint plans_done_is_array check (jsonb_typeof(done_step_ids) = 'array')
);

create index plans_user_id_idx on public.plans (user_id);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- step_reports — "this step looks outdated" reports. Insert-only for the public.
-- ---------------------------------------------------------------------------
create table public.step_reports (
  id         uuid primary key default gen_random_uuid(),
  step_id    uuid not null references public.steps (id) on delete cascade,
  reason     text not null,
  comment    text,
  created_at timestamptz not null default now(),
  constraint step_reports_reason_check check (
    reason in ('outdated', 'wrong-info', 'broken-link', 'other')
  ),
  constraint step_reports_comment_len check (comment is null or char_length(comment) <= 2000)
);

create index step_reports_step_id_idx on public.step_reports (step_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- This project runs with new-table auto-exposure disabled (see config.toml:
-- api.auto_expose_new_tables), matching the current Supabase cloud default:
-- privileges on new `public` tables are NOT auto-granted to the Data API roles.
-- So table privileges must be granted explicitly; RLS policies below then narrow
-- what each role can actually touch. Without these grants the anon/authenticated
-- roles get "permission denied" even for rows a policy would allow.

grant select on public.sections  to anon, authenticated;
grant select on public.steps     to anon, authenticated;
grant select on public.benefits  to anon, authenticated;

-- step_reports: insert-only for the public (no select grant → cannot read back).
grant insert on public.step_reports to anon, authenticated;

-- plans: anyone may create one; only signed-in owners read/update their own.
grant insert         on public.plans to anon;
grant select, insert, update on public.plans to authenticated;

-- Trusted server code (content import, admin) uses the service_role key, which
-- bypasses RLS; give it full DML on every content table explicitly.
grant select, insert, update, delete
  on public.sections, public.steps, public.benefits, public.plans, public.step_reports
  to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Content tables: world-readable, no client writes (service_role bypasses RLS
-- and is what the content import uses).

alter table public.sections enable row level security;
alter table public.steps enable row level security;
alter table public.benefits enable row level security;
alter table public.plans enable row level security;
alter table public.step_reports enable row level security;

create policy "sections are publicly readable"
  on public.sections for select
  to anon, authenticated
  using (true);

create policy "steps are publicly readable"
  on public.steps for select
  to anon, authenticated
  using (true);

create policy "benefits are publicly readable"
  on public.benefits for select
  to anon, authenticated
  using (true);

-- step_reports: anyone may file a report (insert); nobody may read them back
-- through the API (no select policy → denied for anon/authenticated).
create policy "anyone can file a step report"
  on public.step_reports for insert
  to anon, authenticated
  with check (true);

-- plans: a client may create a plan; anonymous plans have a null user_id,
-- account plans must match the caller. Owners can read/update their own rows.
-- Public read-by-share-slug goes through get_plan_by_share_slug() below so a
-- broad table scan can never enumerate every plan.
create policy "clients can create plans"
  on public.plans for insert
  to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

create policy "owners can read their plans"
  on public.plans for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "owners can update their plans"
  on public.plans for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Public, safe read of a single plan by its unguessable share slug.
-- SECURITY DEFINER so it can read past RLS, but only ever returns the one row
-- whose slug the caller already knows.
create or replace function public.get_plan_by_share_slug(p_share_slug text)
returns public.plans
language sql
stable
security definer
set search_path = public
as $$
  select * from public.plans where share_slug = p_share_slug;
$$;

grant execute on function public.get_plan_by_share_slug(text) to anon, authenticated;
