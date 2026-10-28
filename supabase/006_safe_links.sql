-- Candidate Pool — only web links (http/https) may be stored as CV or meeting links.
-- Run AFTER 005_divisions.sql. Safe to run more than once.
--
-- The website already refuses other links; this makes the database refuse them too,
-- so a "javascript:" or "data:" link can never reach another user's screen.

-- Clear any link that is not a web address (expected: none).
update public.candidates set cv_url = null
 where cv_url is not null and cv_url !~* '^https?://[^[:space:]]+$';
update public.candidates set meeting_link = null
 where meeting_link is not null and meeting_link !~* '^https?://[^[:space:]]+$';

alter table public.candidates drop constraint if exists candidates_cv_url_web;
alter table public.candidates add constraint candidates_cv_url_web
  check (cv_url is null or cv_url ~* '^https?://[^[:space:]]+$');
alter table public.candidates drop constraint if exists candidates_meeting_link_web;
alter table public.candidates add constraint candidates_meeting_link_web
  check (meeting_link is null or meeting_link ~* '^https?://[^[:space:]]+$');

-- Speeds up "what changed since my last load" (the website now downloads only changed rows).
create index if not exists candidates_updated_at_idx on public.candidates (updated_at);

-- Check: should list both constraints.
select conname from pg_constraint
 where conrelid = 'public.candidates'::regclass and conname like 'candidates_%_web';
