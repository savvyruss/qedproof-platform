-- ═══════════════════════════════════════════════════════════════
-- QED PROOF — Structured outcome check-ins
-- Run once in Supabase SQL editor (or via: supabase db push)
--
-- A question bank per organisation (your 45-question framework),
-- plus a check-in record per respondent per time point, plus one
-- answer row per question — so the same respondent's scores can be
-- tracked over time (Improving / Static / Worsening), not just a
-- single free-text blob.
-- ═══════════════════════════════════════════════════════════════

create type outcome_trend as enum ('improving', 'static', 'worsening');

create table public.outcome_questions (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,

  area_code       text not null,     -- e.g. 'Safety', 'MH', 'WB', 'Rels', 'GA', 'Opp', 'Satisfied', 'WW', 'Res'
  area_label      text not null,     -- e.g. 'Safety', 'Mental Health', 'Wellbeing'
  question_text   text not null,
  sort_order      integer not null default 0,

  -- Safeguarding: mark a question as risk-relevant, and which direction
  -- of score is concerning, so answers can be flagged automatically.
  -- concerning_direction: 'high' = a high score (near 10) is concerning,
  -- 'low' = a low score (near 1) is concerning. Only meaningful when
  -- is_sensitive is true.
  is_sensitive         boolean not null default false,
  concerning_direction text check (concerning_direction in ('high', 'low')),
  concerning_threshold smallint default 6,

  created_at      timestamptz not null default now()
);

create index outcome_questions_org_id on public.outcome_questions(organisation_id);

create table public.outcome_checkins (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,

  respondent_ref  text,              -- anonymous/pseudonymous ID, so repeat check-ins can be linked
  checkin_date    date not null default current_date,
  submitted_by    uuid references public.profiles(id),

  has_flag        boolean not null default false,  -- true if any answer tripped a safeguarding flag
  created_at      timestamptz not null default now()
);

create index outcome_checkins_project_id on public.outcome_checkins(project_id);
create index outcome_checkins_org_id on public.outcome_checkins(organisation_id);

create table public.outcome_answers (
  id           uuid primary key default uuid_generate_v4(),
  checkin_id   uuid not null references public.outcome_checkins(id) on delete cascade,
  question_id  uuid not null references public.outcome_questions(id) on delete cascade,

  score        smallint not null check (score between 1 and 10),
  trend        outcome_trend,
  reason       text,
  is_flagged   boolean not null default false,

  created_at   timestamptz not null default now()
);

create index outcome_answers_checkin_id on public.outcome_answers(checkin_id);

alter table public.outcome_questions enable row level security;
alter table public.outcome_checkins  enable row level security;
alter table public.outcome_answers   enable row level security;

-- ── Outcome questions (the question bank) ──
create policy "Members can read their org's outcome questions"
  on public.outcome_questions for select
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Admins can manage outcome questions"
  on public.outcome_questions for all using (public.is_admin());

-- ── Outcome check-ins ──
create policy "Members can read their org's checkins"
  on public.outcome_checkins for select
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Members can insert checkins"
  on public.outcome_checkins for insert
  with check (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

create policy "Members can update their checkins"
  on public.outcome_checkins for update
  using (organisation_id = any(public.get_user_org_ids()) or public.is_admin());

-- ── Outcome answers ──
create policy "Members can read answers for their org's checkins"
  on public.outcome_answers for select
  using (checkin_id in (
    select id from public.outcome_checkins
    where organisation_id = any(public.get_user_org_ids())
  ) or public.is_admin());

create policy "Members can insert answers"
  on public.outcome_answers for insert
  with check (checkin_id in (
    select id from public.outcome_checkins
    where organisation_id = any(public.get_user_org_ids())
  ) or public.is_admin());

-- Per-question average score over time, per project — powers outcome
-- framework "current value" display without a separate rollup job.
create view public.outcome_question_averages as
select
  c.project_id,
  a.question_id,
  q.area_code,
  q.area_label,
  q.question_text,
  round(avg(a.score), 1)  as avg_score,
  count(*)                as response_count,
  max(c.checkin_date)     as last_checkin_date
from public.outcome_answers a
join public.outcome_checkins c on c.id = a.checkin_id
join public.outcome_questions q on q.id = a.question_id
group by c.project_id, a.question_id, q.area_code, q.area_label, q.question_text;
