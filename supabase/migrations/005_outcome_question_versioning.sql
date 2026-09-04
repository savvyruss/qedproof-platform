-- ═══════════════════════════════════════════════════════════════
-- QED PROOF — Outcome question versioning
-- Run once in Supabase SQL editor (or via: supabase db push)
--
-- Marks the existing 45-question set as version 1. Future edits to
-- the framework create a new version rather than overwriting rows —
-- so a check-in answered in the past stays tied to the exact
-- question wording it was actually asked against.
-- ═══════════════════════════════════════════════════════════════

alter table public.outcome_questions add column version integer not null default 1;
alter table public.outcome_questions add column is_active boolean not null default true;

create index outcome_questions_org_active on public.outcome_questions(organisation_id, is_active);
