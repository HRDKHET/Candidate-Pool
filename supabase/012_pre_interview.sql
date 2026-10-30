-- Candidate Pool — HRS marks whether a candidate has had a pre-interview.
-- Run AFTER 011_candidate_contacts.sql. Safe to run more than once. Existing data is kept.
--
-- Shown on the candidate cards to แผนก accounts ("Pre-interviewed" / "Not pre-interviewed"),
-- so it lives on public.candidates. Only HRS can change it (candidates_admin_update).

alter table public.candidates add column if not exists pre_interviewed boolean not null default false;

-- Check: one row, pre_interviewed = 0 on the first run.
select count(*) filter (where pre_interviewed) as pre_interviewed, count(*) as candidates from public.candidates;
