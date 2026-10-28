-- Candidate Pool — HRS scores each candidate 1–5 on seven dimensions for the comparison chart.
-- Run AFTER 008_units_and_salary_per_candidate.sql. Safe to run more than once. Existing data is kept.
--
-- candidates.scores is a JSON object, e.g. {"exp":4,"skill":5,"result":3}. Keys:
--   exp ประสบการณ์ · skill ความรู้และทักษะ · result ผลงาน · career เส้นทางอาชีพ
--   learn การเรียนรู้ · trust ความน่าเชื่อถือ · tech Tech & AI
-- A missing key means "not scored yet". Only HRS can write it (candidates_admin_update);
-- แผนก accounts read it with the rest of the candidate row.

alter table public.candidates add column if not exists scores jsonb not null default '{}'::jsonb;

create or replace function public.valid_scores(s jsonb) returns boolean
language sql immutable set search_path = public as $$
  select jsonb_typeof(s) = 'object' and not exists (
    select 1 from jsonb_each(s) e
    where e.key not in ('exp', 'skill', 'result', 'career', 'learn', 'trust', 'tech')
       or not case when jsonb_typeof(e.value) = 'number'
                   then e.value::numeric in (1, 2, 3, 4, 5) else false end
  );
$$;

alter table public.candidates drop constraint if exists candidates_scores_valid;
alter table public.candidates add constraint candidates_scores_valid check (public.valid_scores(scores));

-- Check: one row, scored = number of candidates that already have at least one score (0 on first run).
select count(*) filter (where scores <> '{}'::jsonb) as scored, count(*) as candidates from public.candidates;
