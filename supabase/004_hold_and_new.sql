-- Candidate Pool — 72-hour decision window and "New" badge.
-- Run AFTER 003_interviews_notifications.sql. Safe to run more than once.
--
-- * A unit that picks a candidate from the Candidate Pool has 72 hours to choose a
--   decision. Still "รอพิจารณา" after that -> back to the Candidate Pool + notification.
-- * created_at records when a candidate entered the system (drives the "New" badge).

alter table public.candidates
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists hold_until timestamptz;

-- Keeps hold_until right for every kind of update (pick, return, HRS move, decisions).
create or replace function public.candidates_hold() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.hold_until := null;
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
drop trigger if exists candidates_hold on public.candidates;
create trigger candidates_hold before insert or update on public.candidates
  for each row execute function public.candidates_hold();

-- Called by the website on every page load; any signed-in account may run it.
create or replace function public.release_expired_holds() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  if auth.uid() is null then return 0; end if;
  for r in
    select id, name, location from candidates
     where hold_until <= now() and decision = 'รอพิจารณา' and location <> 'HR'
     for update skip locked
  loop
    update candidates set location = 'HR', assigned_by = null, decision = 'รอพิจารณา',
           interview_at = null, interview_mode = null, interview_status = null, interviewers = '[]',
           interview_location = null, meeting_link = null, project_name = null, remark = null,
           interview_requested_by = null, interview_requested_at = null,
           interview_confirmed_at = null, interview_confirm_note = null
     where id = r.id;
    insert into notifications (recipient, kind, candidate_id, title, body)
    values (r.location, 'hold_expired', r.id, 'หมดเวลาพิจารณา ' || r.id || ' ' || r.name,
            'ครบ 72 ชม. โดยยังไม่ได้ตัดสินใจ ผู้สมัครถูกคืนเข้า Candidate Pool แล้ว');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Same as in 003, with "คลังกลาง" renamed to "Candidate Pool" in the messages.
create or replace function public.pjt_pick(p_id text) returns public.candidates
language plpgsql security definer set search_path = public as $$
declare u text := my_unit(); r candidates;
begin
  if u is null then raise exception 'บัญชีนี้ไม่มีสิทธิ์เลือกผู้สมัคร'; end if;
  update candidates set location = u, assigned_by = u, decision = 'รอพิจารณา',
         interview_at = null, interview_mode = null, interview_status = null, interviewers = '[]',
         interview_location = null, meeting_link = null, project_name = null, remark = null,
         interview_requested_by = null, interview_requested_at = null,
         interview_confirmed_at = null, interview_confirm_note = null
   where id = p_id and location = 'HR'
  returning * into r;
  if not found then raise exception '% ไม่อยู่ใน Candidate Pool แล้ว อาจถูกแผนกอื่นเลือกไป', p_id; end if;
  return r;
end $$;

create or replace function public.pjt_return(p_id text) returns public.candidates
language plpgsql security definer set search_path = public as $$
declare u text := my_unit(); r candidates; had_interview boolean;
begin
  if u is null then raise exception 'บัญชีนี้ไม่มีสิทธิ์'; end if;
  select interview_status is not null into had_interview from candidates where id = p_id and location = u;
  update candidates set location = 'HR', assigned_by = null, decision = 'รอพิจารณา',
         interview_at = null, interview_mode = null, interview_status = null, interviewers = '[]',
         interview_location = null, meeting_link = null, project_name = null, remark = null,
         interview_requested_by = null, interview_requested_at = null,
         interview_confirmed_at = null, interview_confirm_note = null
   where id = p_id and location = u
  returning * into r;
  if not found then raise exception '% ไม่ได้อยู่ใน Pool ของ %', p_id, u; end if;
  if had_interview then
    insert into notifications (recipient, kind, candidate_id, title, body)
    values ('HRS', 'interview_cancelled', r.id, u || ' คืน ' || r.id || ' ' || r.name || ' กลับ Candidate Pool',
            'นัดสัมภาษณ์ที่มีอยู่ถูกยกเลิก');
  end if;
  return r;
end $$;

revoke execute on function public.release_expired_holds() from public, anon;
grant execute on function public.release_expired_holds() to authenticated;

-- Check: both new columns exist.
select count(*) filter (where created_at is not null) as with_created_at,
       count(*) filter (where hold_until is not null) as on_hold
  from public.candidates;
