-- ═══════════════════════════════════════════════════════════════
-- QED PROOF — Social Impact Evaluation Platform
-- Initial Schema Migration
-- Run in Supabase SQL editor or via: supabase db push
-- ═══════════════════════════════════════════════════════════════

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for text search

-- ───────────────────────────────────────────────────────────────
-- ENUMS
-- ───────────────────────────────────────────────────────────────
create type user_role as enum ('admin', 'client', 'viewer');
create type entry_category as enum (
  'beneficiary_feedback',
  'staff_observation',
  'case_study',
  'community_response',
  'stakeholder_input'
);
create type entry_source as enum ('manual', 'csv', 'bulk', 'webhook', 'api');
create type report_type as enum ('output', 'outcome', 'funder', 'internal');
create type report_status as enum ('draft', 'generated', 'published');
create type outcome_status as enum ('on_track', 'at_risk', 'achieved', 'not_started');

-- ───────────────────────────────────────────────────────────────
-- PROFILES  (extends Supabase auth.users)
-- ───────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  role          user_role not null default 'client',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────────
-- ORGANISATIONS  (one per client organisation)
-- ───────────────────────────────────────────────────────────────
create table public.organisations (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,               -- e.g. "youth-futures-trust"
  logo_url      text,
  primary_color text default '#1E4D35',
  contact_email text,
  contact_phone text,
  address       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- ORGANISATION MEMBERS  (many users can belong to one org)
-- ───────────────────────────────────────────────────────────────
create table public.organisation_members (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            user_role not null default 'client',
  invited_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  unique (organisation_id, user_id)
);

-- ───────────────────────────────────────────────────────────────
-- PROJECTS  (each org can run multiple evaluation projects)
-- ───────────────────────────────────────────────────────────────
create table public.projects (
  id                  uuid primary key default uuid_generate_v4(),
  organisation_id     uuid not null references public.organisations(id) on delete cascade,
  name                text not null,
  description         text,
  start_date          date,
  end_date            date,
  reporting_period    text,                    -- e.g. "April 2024 – March 2025"
  funder_name         text,
  target_beneficiaries integer,
  is_active           boolean not null default true,
  created_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- OUTCOME FRAMEWORKS  (Theory of Change outcomes per project)
-- ───────────────────────────────────────────────────────────────
create table public.outcome_frameworks (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  name            text not null,               -- e.g. "Improved wellbeing"
  description     text,
  outcome_area    text,                        -- e.g. "Wellbeing", "Skills & employment"
  indicator       text,                        -- what we measure
  target_value    numeric,                     -- numeric target if applicable
  current_value   numeric default 0,
  unit            text,                        -- e.g. "%", "people", "sessions"
  status          outcome_status default 'not_started',
  sort_order      integer default 0,
  created_at      timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- FEEDBACK ENTRIES  (the core data collected)
-- ───────────────────────────────────────────────────────────────
create table public.entries (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,

  -- Respondent
  respondent_name text,
  respondent_ref  text,                        -- anonymous ID if preferred

  -- Content
  feedback_text   text not null,
  category        entry_category not null default 'beneficiary_feedback',
  outcome_area    text,                        -- links to outcome_frameworks.outcome_area
  rating          smallint check (rating between 1 and 5),
  source          entry_source not null default 'manual',

  -- Metadata
  collected_date  date not null default current_date,
  collected_by    uuid references public.profiles(id),
  external_ref    text,                        -- e.g. Tally submission ID

  -- AI analysis results (stored per-entry after analysis)
  sentiment       text check (sentiment in ('positive', 'neutral', 'negative')),
  sentiment_score numeric(3,2),               -- 0.00 – 1.00
  ai_themes       text[],                     -- extracted themes

  created_at      timestamptz not null default now()
);

-- Full-text search index on feedback
create index entries_feedback_search on public.entries using gin(to_tsvector('english', feedback_text));
create index entries_project_id on public.entries(project_id);
create index entries_org_id on public.entries(organisation_id);
create index entries_collected_date on public.entries(collected_date);

-- ───────────────────────────────────────────────────────────────
-- ANALYSIS RUNS  (one AI analysis = one row, covers N entries)
-- ───────────────────────────────────────────────────────────────
create table public.analysis_runs (
  id                    uuid primary key default uuid_generate_v4(),
  project_id            uuid not null references public.projects(id) on delete cascade,
  entry_count           integer not null,
  filter_category       text,                 -- which category was filtered
  focus_area            text,

  -- Structured results from Claude
  summary               text,
  positive_count        integer,
  neutral_count         integer,
  negative_count        integer,
  sentiment_score       numeric(3,1),         -- 1.0 – 10.0
  themes                text[],
  key_outcomes          text[],
  challenges            text[],
  recommended_actions   text[],
  standout_quote        text,
  report_narrative      text,

  -- Raw response stored for auditing
  raw_response          jsonb,

  run_by                uuid references public.profiles(id),
  created_at            timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- REPORTS  (generated output and outcome reports)
-- ───────────────────────────────────────────────────────────────
create table public.reports (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id),

  title           text not null,
  report_type     report_type not null,
  status          report_status not null default 'draft',
  reporting_period text,

  -- Report content (AI-generated narrative sections)
  executive_summary   text,
  outputs_achieved    text,
  outcomes_achieved   text,
  beneficiary_voice   text,
  challenges_learning text,
  forward_look        text,
  recommendations     text,

  -- Full HTML for export
  html_content    text,

  generated_by    uuid references public.profiles(id),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- WEBHOOK SOURCES  (external form integrations)
-- ───────────────────────────────────────────────────────────────
create table public.webhook_sources (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  name            text not null,               -- e.g. "Tally beneficiary survey"
  provider        text not null,               -- 'tally', 'typeform', 'google_forms', 'generic'
  webhook_url     text,                        -- the URL to give to the form provider
  secret_token    text,                        -- for validating incoming webhooks
  field_mapping   jsonb,                       -- maps form field IDs to our schema
  is_active       boolean default true,
  last_received   timestamptz,
  entry_count     integer default 0,
  created_at      timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────
-- ACTIVITY LOG  (audit trail)
-- ───────────────────────────────────────────────────────────────
create table public.activity_log (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  user_id         uuid references public.profiles(id),
  action          text not null,               -- e.g. 'entry.created', 'report.generated'
  resource_type   text,
  resource_id     uuid,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Every table is locked down — users only see their org's data
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles             enable row level security;
alter table public.organisations        enable row level security;
alter table public.organisation_members enable row level security;
alter table public.projects             enable row level security;
alter table public.outcome_frameworks   enable row level security;
alter table public.entries              enable row level security;
alter table public.analysis_runs        enable row level security;
alter table public.reports              enable row level security;
alter table public.webhook_sources      enable row level security;
alter table public.activity_log         enable row level security;

-- ── Helper: get current user's org IDs ──
create or replace function public.get_user_org_ids()
returns uuid[] language sql security definer stable as $$
  select array_agg(organisation_id)
  from public.organisation_members
  where user_id = auth.uid()
  and accepted_at is not null
$$;

-- ── Helper: is current user an admin? ──
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ── Profiles ──
create policy "Users can read own profile"
  on public.profiles for select using (id = auth.uid() or public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());

-- ── Organisations ──
create policy "Members can read their org"
  on public.organisations for select
  using (id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Admins can manage orgs"
  on public.organisations for all using (public.is_admin());

-- ── Organisation members ──
create policy "Members can read their org's members"
  on public.organisation_members for select
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Admins can manage members"
  on public.organisation_members for all using (public.is_admin());

-- ── Projects ──
create policy "Members can read their org's projects"
  on public.projects for select
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Members can insert projects"
  on public.projects for insert
  with check (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Members can update their org's projects"
  on public.projects for update
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Admins can delete projects"
  on public.projects for delete using (public.is_admin());

-- ── Outcome frameworks ──
create policy "Members can read outcomes"
  on public.outcome_frameworks for select
  using (project_id in (
    select id from public.projects where organisation_id = any(public.get_user_org_ids())
  ) or public.is_admin());

create policy "Members can manage outcomes"
  on public.outcome_frameworks for all
  using (project_id in (
    select id from public.projects where organisation_id = any(public.get_user_org_ids())
  ) or public.is_admin());

-- ── Entries ──
create policy "Members can read their org's entries"
  on public.entries for select
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Members can insert entries"
  on public.entries for insert
  with check (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Members can update their entries"
  on public.entries for update
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Admins can delete entries"
  on public.entries for delete using (public.is_admin());

-- ── Analysis runs ──
create policy "Members can read analysis"
  on public.analysis_runs for select
  using (project_id in (
    select id from public.projects where organisation_id = any(public.get_user_org_ids())
  ) or public.is_admin());

create policy "Members can create analysis"
  on public.analysis_runs for insert
  with check (project_id in (
    select id from public.projects where organisation_id = any(public.get_user_org_ids())
  ) or public.is_admin());

-- ── Reports ──
create policy "Members can read reports"
  on public.reports for select
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Members can manage reports"
  on public.reports for all
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

-- ── Webhook sources ──
create policy "Members can manage webhooks"
  on public.webhook_sources for all
  using (project_id in (
    select id from public.projects where organisation_id = any(public.get_user_org_ids())
  ) or public.is_admin());

-- ── Activity log ──
create policy "Members can read their org's activity"
  on public.activity_log for select
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "System can insert activity"
  on public.activity_log for insert with check (true);

-- ═══════════════════════════════════════════════════════════════
-- USEFUL VIEWS
-- ═══════════════════════════════════════════════════════════════

-- Project summary view with entry counts and avg rating
create view public.project_summaries as
select
  p.id,
  p.organisation_id,
  p.name,
  p.description,
  p.reporting_period,
  p.is_active,
  count(e.id)                                        as total_entries,
  count(e.id) filter (where e.rating is not null)    as rated_entries,
  round(avg(e.rating), 1)                            as avg_rating,
  count(distinct e.outcome_area)                     as outcome_areas_covered,
  max(e.collected_date)                              as last_entry_date,
  (select count(*) from public.reports r
   where r.project_id = p.id and r.status = 'published') as published_reports
from public.projects p
left join public.entries e on e.project_id = p.id
group by p.id;

-- Organisation overview for admin
create view public.organisation_summaries as
select
  o.id,
  o.name,
  o.slug,
  o.created_at,
  count(distinct om.user_id)   as member_count,
  count(distinct p.id)         as project_count,
  count(distinct e.id)         as total_entries,
  max(e.created_at)            as last_activity
from public.organisations o
left join public.organisation_members om on om.organisation_id = o.id
left join public.projects p on p.organisation_id = o.id
left join public.entries e on e.organisation_id = o.id
group by o.id;

-- ═══════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER (keeps updated_at fresh automatically)
-- ═══════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.organisations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reports
  for each row execute function public.set_updated_at();
