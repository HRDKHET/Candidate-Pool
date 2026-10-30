-- Candidate Pool — candidate email and phone, visible to HRS only.
-- Run AFTER 010_no_past_interviews.sql. Safe to run more than once. Existing data is kept.
--
-- Contacts live in their own table (like candidate_salaries in 007) because แผนก accounts can read
-- public.candidates: hiding the fields in the page alone would still send them to the browser.
-- Every policy below is HRS-only, so a แผนก account receives no rows at all.

create table if not exists public.candidate_contacts (
  candidate_id  text primary key references public.candidates (id) on delete cascade on update cascade,
  email         text check (email is null or char_length(email) <= 200),
  phone         text check (phone is null or char_length(phone) <= 50),
  updated_at    timestamptz not null default now()
);

drop trigger if exists candidate_contacts_touch on public.candidate_contacts;
create trigger candidate_contacts_touch before insert or update on public.candidate_contacts
  for each row execute function public.touch_updated_at();

alter table public.candidate_contacts enable row level security;
drop policy if exists candidate_contacts_admin_read on public.candidate_contacts;
create policy candidate_contacts_admin_read on public.candidate_contacts for select to authenticated
  using (public.is_admin());
drop policy if exists candidate_contacts_admin_insert on public.candidate_contacts;
create policy candidate_contacts_admin_insert on public.candidate_contacts for insert to authenticated
  with check (public.is_admin());
drop policy if exists candidate_contacts_admin_update on public.candidate_contacts;
create policy candidate_contacts_admin_update on public.candidate_contacts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists candidate_contacts_admin_delete on public.candidate_contacts;
create policy candidate_contacts_admin_delete on public.candidate_contacts for delete to authenticated
  using (public.is_admin());
revoke all on public.candidate_contacts from anon;

-- Make the API see the new table right away (otherwise: "Could not find the table ... in the schema cache").
notify pgrst, 'reload schema';

-- Check: one row, rls_on = true and policies = 4.
select c.relrowsecurity as rls_on,
       (select count(*) from pg_policies p where p.tablename = 'candidate_contacts') as policies
  from pg_class c where c.oid = 'public.candidate_contacts'::regclass;
