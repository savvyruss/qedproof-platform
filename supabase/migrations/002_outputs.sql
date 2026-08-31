-- ═══════════════════════════════════════════════════════════════
-- QED PROOF — Outputs (quantitative output tracking)
-- Run this once in Supabase SQL editor (or via: supabase db push)
-- Adds a table for dated numeric records — e.g. "24 attendees, 15 Aug"
-- ═══════════════════════════════════════════════════════════════

create table public.outputs (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,

  metric_name     text not null,               -- e.g. "Attendees", "Sessions delivered"
  value           numeric not null,
  unit            text,                        -- e.g. "people", "sessions" (optional)
  recorded_date   date not null default current_date,
  notes           text,

  recorded_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

create index outputs_project_id on public.outputs(project_id);
create index outputs_org_id on public.outputs(organisation_id);
create index outputs_metric_name on public.outputs(metric_name);

alter table public.outputs enable row level security;

create policy "Members can read their org's outputs"
  on public.outputs for select
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Members can insert outputs"
  on public.outputs for insert
  with check (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Members can update their outputs"
  on public.outputs for update
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Admins can delete outputs"
  on public.outputs for delete using (public.is_admin());

-- Per-project totals, grouped by metric — powers the summary view
create view public.output_totals as
select
  project_id,
  metric_name,
  unit,
  sum(value)          as total_value,
  count(*)            as record_count,
  max(recorded_date)  as last_recorded
from public.outputs
group by project_id, metric_name, unit;
