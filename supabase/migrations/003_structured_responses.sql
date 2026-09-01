-- ═══════════════════════════════════════════════════════════════
-- QED PROOF — Structured survey responses
-- Run this once in Supabase SQL editor (or via: supabase db push)
-- Lets one entry hold multiple question→answer pairs (real survey
-- exports have several questions per respondent, not one text blob).
-- ═══════════════════════════════════════════════════════════════

alter table public.entries add column responses jsonb;

create index entries_responses_gin on public.entries using gin(responses);
