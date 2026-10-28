-- Candidate Pool — HRS edits / deletes แผนก; salary visibility per candidate.
-- Run AFTER 007_salary_visibility.sql. Safe to run more than once. Existing data is kept.
--
-- * admin_update_unit: move a แผนก to another ฝ่าย and/or change its code. A new code
--   also renames the login account, the pool, and every candidate / notification that
--   points at it. Running 72-hour clocks are kept as they are.
-- * admin_delete_unit: candidates in that pool go back to the Candidate Pool (decisions
--   and interviews cleared), then the แผนก and its login account are removed.
-- * candidate_salaries.show_salary: HRS shows the salary of one candidate at a time.
--   Default off. The site-wide switch from 007 is no longer used.

-- ---------- keep the 72-hour clock when HRS renames a แผนก ----------
create or replace function public.candidates_hold() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.hold_until := null;
  elsif coalesce(current_setting('app.keep_hold', true), '') = 'on' then
    new.hold_until := old.hold_until;
  elsif new.location is distinct from old.location then
    -- Only a unit picking for itself starts the clock.
    if new.location <> 'HR' and new.assigned_by = new.location then
      new.hold_until := now() + interval '72 hours';
    else
      new.hold_until := null;
    end if;
  elsif new.decision <> 'รอพิจารณา' then
    new.hold_until := null;
  else
    new.hold_until := old.hold_until;
  end if;
  return new;
end $$;

-- ---------- HRS: edit a แผนก ----------
create or replace function public.admin_update_unit(p_code text, p_new_code text, p_division text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_old text := upper(trim(p_code));
  v_new text := upper(trim(coalesce(nullif(trim(p_new_code), ''), p_code)));
  v_old_email text := lower(v_old) || '@candidate-pool.local';
  v_new_email text := lower(v_new) || '@candidate-pool.local';
begin
  if not is_admin() then raise exception 'เฉพาะ HRS เท่านั้น'; end if;
  if not exists (select 1 from units where code = v_old) then raise exception 'ไม่พบแผนก %', v_old; end if;
  if not exists (select 1 from divisions where id = p_division) then raise exception 'ไม่พบฝ่ายนี้'; end if;
  if v_new !~ '^[A-Z0-9][A-Z0-9-]{1,19}$' or v_new = 'HR' then
    raise exception 'รหัสแผนกใช้ได้เฉพาะ A–Z, 0–9 และ - ยาว 2–20 ตัว';
  end if;

  if v_new = v_old then
    update units set division_id = p_division where code = v_old;
    return v_old;
  end if;

  if exists (select 1 from units where code = v_new) then raise exception 'มีแผนก % อยู่แล้ว', v_new; end if;
  if exists (select 1 from auth.users where email = v_new_email) then raise exception 'มีบัญชี % อยู่แล้ว', lower(v_new); end if;

  insert into units (code, division_id, sort) select v_new, p_division, sort from units where code = v_old;

  perform set_config('app.keep_hold', 'on', true);
  update candidates set
    location = case when location = v_old then v_new else location end,
    assigned_by = case when assigned_by = v_old then v_new else assigned_by end,
    interview_requested_by = case when interview_requested_by = v_old then v_new else interview_requested_by end
  where location = v_old or assigned_by = v_old or interview_requested_by = v_old;
  perform set_config('app.keep_hold', '', true);

  update notifications set recipient = v_new where recipient = v_old;
  update profiles set unit = v_new, email = v_new_email where unit = v_old;
  update auth.users set email = v_new_email, updated_at = now() where email = v_old_email;
  update auth.identities set identity_data = identity_data || jsonb_build_object('email', v_new_email), updated_at = now()
   where provider = 'email' and user_id in (select id from profiles where unit = v_new);

  delete from units where code = v_old;
  return v_new;
end $$;

-- ---------- HRS: delete a แผนก ----------
create or replace function public.admin_delete_unit(p_code text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(p_code));
  n integer;
begin
  if not is_admin() then raise exception 'เฉพาะ HRS เท่านั้น'; end if;
  if not exists (select 1 from units where code = v_code) then raise exception 'ไม่พบแผนก %', v_code; end if;

  -- Candidates in this pool go back to the Candidate Pool.
  update candidates set location = 'HR', assigned_by = null, decision = 'รอพิจารณา',
         interview_at = null, interview_mode = null, interview_status = null, interviewers = '[]',
         interview_location = null, meeting_link = null, project_name = null, remark = null,
         interview_requested_by = null, interview_requested_at = null,
         interview_confirmed_at = null, interview_confirm_note = null
   where location = v_code;
  get diagnostics n = row_count;
  update candidates set assigned_by = null where assigned_by = v_code;
  update candidates set interview_requested_by = null where interview_requested_by = v_code;
  -- Rows last edited by this account would block deleting it; the update re-stamps them with HRS.
  update candidates set updated_at = now() where updated_by in (select id from profiles where unit = v_code);

  delete from notifications where recipient = v_code;
  delete from auth.users where id in (select id from profiles where unit = v_code);  -- removes the profile too
  delete from profiles where unit = v_code;
  delete from units where code = v_code;
  return n;
end $$;

revoke execute on function public.admin_update_unit(text, text, text) from public, anon;
grant execute on function public.admin_update_unit(text, text, text) to authenticated;
revoke execute on function public.admin_delete_unit(text) from public, anon;
grant execute on function public.admin_delete_unit(text) to authenticated;

-- ---------- salary visibility per candidate ----------
alter table public.candidate_salaries add column if not exists show_salary boolean not null default false;

drop policy if exists candidate_salaries_read on public.candidate_salaries;
create policy candidate_salaries_read on public.candidate_salaries for select to authenticated
  using (public.is_admin() or (show_salary and exists (select 1 from public.candidates c where c.id = candidate_id)));

-- Check: every แผนก with its ฝ่าย, and how many candidates show their salary (expected: 0).
select (select string_agg(u.code || ' (' || d.name || ')', ', ' order by d.sort, u.sort)
          from public.units u join public.divisions d on d.id = u.division_id) as units,
       (select count(*) from public.candidate_salaries where show_salary) as salaries_shown;
