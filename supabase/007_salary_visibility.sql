-- Candidate Pool — HRS decides whether units see salaries; edit / delete ฝ่าย.
-- Run AFTER 006_safe_links.sql. Safe to run more than once. Existing data is kept.
--
-- * Salaries move out of public.candidates into public.candidate_salaries, so they are
--   never sent to a unit account unless HRS turns "show salaries" on (default: off).
--   Hiding them in the page alone would not be enough: the data would still reach the browser.
-- * app_settings holds site-wide switches set by HRS.
-- * HRS can rename a ฝ่าย and delete a ฝ่าย that has no แผนก.

-- ---------- settings ----------
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
insert into public.app_settings (key, value) values ('show_salaries', 'false') on conflict (key) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated using (true);
drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.salaries_visible() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce((select value = 'true'::jsonb from app_settings where key = 'show_salaries'), false)
$$;

-- ---------- salaries in their own table ----------
create table if not exists public.candidate_salaries (
  candidate_id     text primary key references public.candidates (id) on delete cascade on update cascade,
  salary_current   int,
  salary_expected  int,
  updated_at       timestamptz not null default now()
);

do $$ begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'candidates' and column_name = 'salary_current') then
    insert into public.candidate_salaries (candidate_id, salary_current, salary_expected)
    select id, salary_current, salary_expected from public.candidates
     where salary_current is not null or salary_expected is not null
    on conflict (candidate_id) do update
      set salary_current = excluded.salary_current, salary_expected = excluded.salary_expected;
    alter table public.candidates drop column salary_current;
    alter table public.candidates drop column salary_expected;
  end if;
end $$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists candidate_salaries_touch on public.candidate_salaries;
create trigger candidate_salaries_touch before insert or update on public.candidate_salaries
  for each row execute function public.touch_updated_at();
drop trigger if exists app_settings_touch on public.app_settings;
create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_updated_at();
create index if not exists candidate_salaries_updated_at_idx on public.candidate_salaries (updated_at);

alter table public.candidate_salaries enable row level security;
-- A unit sees a salary only when HRS allows it AND it can see that candidate
-- (the sub-select is itself filtered by the candidates policy).
drop policy if exists candidate_salaries_read on public.candidate_salaries;
create policy candidate_salaries_read on public.candidate_salaries for select to authenticated
  using (public.salaries_visible() and exists (select 1 from public.candidates c where c.id = candidate_id));
drop policy if exists candidate_salaries_admin_insert on public.candidate_salaries;
create policy candidate_salaries_admin_insert on public.candidate_salaries for insert to authenticated
  with check (public.is_admin());
drop policy if exists candidate_salaries_admin_update on public.candidate_salaries;
create policy candidate_salaries_admin_update on public.candidate_salaries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists candidate_salaries_admin_delete on public.candidate_salaries;
create policy candidate_salaries_admin_delete on public.candidate_salaries for delete to authenticated
  using (public.is_admin());

-- ---------- ฝ่าย: delete (only when it has no แผนก; the units foreign key enforces it) ----------
drop policy if exists divisions_admin_delete on public.divisions;
create policy divisions_admin_delete on public.divisions for delete to authenticated using (public.is_admin());

-- Check: show_salaries = false, and how many salary rows were moved.
select (select value from public.app_settings where key = 'show_salaries') as show_salaries,
       (select count(*) from public.candidate_salaries) as salary_rows;
