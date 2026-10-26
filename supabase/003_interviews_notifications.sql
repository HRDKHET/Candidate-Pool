-- Candidate Pool — interview requests (Online/Onsite, several interviewers) and
-- in-app notifications between units and HRS. Run AFTER schema.sql and 002_accounts.sql.
-- Safe to run more than once. Existing candidate data is kept.
--
-- Flow: unit requests an interview  -> notification to HRS
--       HRS confirms (adds Online link) -> notification back to the unit

-- ---------- interview columns ----------
alter table public.candidates
  add column if not exists interview_mode text check (interview_mode in ('online', 'onsite')),
  add column if not exists interview_status text check (interview_status in ('requested', 'confirmed')),
  add column if not exists interviewers jsonb not null default '[]'::jsonb,
  add column if not exists interview_location text,
  add column if not exists meeting_link text,
  add column if not exists interview_requested_by text,
  add column if not exists interview_requested_at timestamptz,
  add column if not exists interview_confirmed_at timestamptz,
  add column if not exists interview_confirm_note text;

-- Interviews booked before this migration count as confirmed.
update public.candidates set interview_status = 'confirmed'
 where interview_at is not null and interview_status is null;

-- ---------- notifications ----------
create table if not exists public.notifications (
  id            bigserial primary key,
  recipient     text not null,          -- 'HRS' or a unit code such as 'PJT-PD-1'
  kind          text not null,          -- interview_requested | interview_confirmed | interview_cancelled
  candidate_id  text references public.candidates (id) on delete cascade,
  title         text not null,
  body          text,
  link          text,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index if not exists notifications_recipient_idx on public.notifications (recipient, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated
  using ((public.is_admin() and recipient = 'HRS') or recipient = public.my_unit());
drop policy if exists notifications_mark_read on public.notifications;
create policy notifications_mark_read on public.notifications for update to authenticated
  using ((public.is_admin() and recipient = 'HRS') or recipient = public.my_unit())
  with check ((public.is_admin() and recipient = 'HRS') or recipient = public.my_unit());

-- Thai-time text used in notification bodies.
create or replace function public.when_text(t timestamptz) returns text
language sql stable as $$
  select to_char(t at time zone 'Asia/Bangkok', 'DD/MM/') ||
         (extract(year from t at time zone 'Asia/Bangkok')::int + 543)::text ||
         to_char(t at time zone 'Asia/Bangkok', ' HH24:MI') || ' น.'
$$;

-- ---------- unit actions (replace the earlier versions) ----------
drop function if exists public.pjt_schedule(text, timestamptz, text, text, text);

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
  if not found then raise exception '% ไม่อยู่ในคลังกลางแล้ว อาจถูกหน่วยงานอื่นเลือกไป', p_id; end if;
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
    values ('HRS', 'interview_cancelled', r.id, u || ' คืน ' || r.id || ' ' || r.name || ' กลับคลังกลาง',
            'นัดสัมภาษณ์ที่มีอยู่ถูกยกเลิก');
  end if;
  return r;
end $$;

create or replace function public.pjt_set_decision(p_id text, p_decision text) returns public.candidates
language plpgsql security definer set search_path = public as $$
declare u text := my_unit(); r candidates; had_interview boolean; keep boolean;
begin
  if u is null then raise exception 'บัญชีนี้ไม่มีสิทธิ์'; end if;
  if p_decision = 'นัดสัมภาษณ์แล้ว' then raise exception 'สถานะนี้ตั้งได้เมื่อ HRS ยืนยันนัดเท่านั้น'; end if;
  keep := p_decision = 'เรียกสัมภาษณ์';
  select interview_status is not null into had_interview from candidates where id = p_id and location = u;
  update candidates set decision = p_decision,
         interview_at = case when keep then interview_at end,
         interview_mode = case when keep then interview_mode end,
         interview_status = case when keep then interview_status end,
         interviewers = case when keep then interviewers else '[]'::jsonb end,
         interview_location = case when keep then interview_location end,
         meeting_link = case when keep then meeting_link end,
         project_name = case when keep then project_name end,
         remark = case when keep then remark end,
         interview_requested_by = case when keep then interview_requested_by end,
         interview_requested_at = case when keep then interview_requested_at end,
         interview_confirmed_at = case when keep then interview_confirmed_at end,
         interview_confirm_note = case when keep then interview_confirm_note end
   where id = p_id and location = u
  returning * into r;
  if not found then raise exception '% ไม่ได้อยู่ใน Pool ของ %', p_id, u; end if;
  if had_interview and not keep then
    insert into notifications (recipient, kind, candidate_id, title, body)
    values ('HRS', 'interview_cancelled', r.id, u || ' ยกเลิกนัดสัมภาษณ์ ' || r.id || ' ' || r.name,
            'เปลี่ยนสถานะเป็น "' || p_decision || '"');
  end if;
  return r;
end $$;

create or replace function public.pjt_request_interview(
  p_id text, p_at timestamptz, p_mode text, p_interviewers jsonb,
  p_location text, p_project text, p_note text) returns public.candidates
language plpgsql security definer set search_path = public as $$
declare u text := my_unit(); r candidates;
begin
  if u is null then raise exception 'บัญชีนี้ไม่มีสิทธิ์'; end if;
  if p_at is null then raise exception 'กรุณาระบุวันและเวลาสัมภาษณ์'; end if;
  if p_mode not in ('online', 'onsite') then raise exception 'กรุณาเลือก Online หรือ Onsite'; end if;
  if jsonb_typeof(p_interviewers) <> 'array' or jsonb_array_length(p_interviewers) = 0 then
    raise exception 'กรุณาระบุผู้สัมภาษณ์อย่างน้อย 1 คน';
  end if;
  if p_mode = 'onsite' and coalesce(trim(p_location), '') = '' then raise exception 'กรุณาระบุสถานที่สัมภาษณ์'; end if;
  update candidates set decision = 'เรียกสัมภาษณ์', interview_status = 'requested',
         interview_at = p_at, interview_mode = p_mode, interviewers = p_interviewers,
         interview_location = case when p_mode = 'onsite' then p_location end, meeting_link = null,
         project_name = p_project, remark = p_note,
         interview_requested_by = u, interview_requested_at = now(),
         interview_confirmed_at = null, interview_confirm_note = null
   where id = p_id and location = u
  returning * into r;
  if not found then raise exception '% ไม่ได้อยู่ใน Pool ของ %', p_id, u; end if;
  insert into notifications (recipient, kind, candidate_id, title, body)
  values ('HRS', 'interview_requested', r.id, u || ' ขอนัดสัมภาษณ์ ' || r.id || ' ' || r.name,
          when_text(p_at) || ' · ' || case when p_mode = 'online' then 'Online' else 'Onsite · ' || p_location end ||
          ' · ผู้สัมภาษณ์ ' || jsonb_array_length(p_interviewers) || ' คน');
  return r;
end $$;

-- ---------- HRS: book / confirm an interview ----------
create or replace function public.admin_set_interview(
  p_id text, p_at timestamptz, p_mode text, p_interviewers jsonb, p_location text,
  p_link text, p_project text, p_note text, p_confirm_note text) returns public.candidates
language plpgsql security definer set search_path = public as $$
declare r candidates;
begin
  if not is_admin() then raise exception 'เฉพาะ HRS เท่านั้น'; end if;
  if p_at is null then raise exception 'กรุณาระบุวันและเวลาสัมภาษณ์'; end if;
  if p_mode not in ('online', 'onsite') then raise exception 'กรุณาเลือก Online หรือ Onsite'; end if;
  if jsonb_typeof(p_interviewers) <> 'array' or jsonb_array_length(p_interviewers) = 0 then
    raise exception 'กรุณาระบุผู้สัมภาษณ์อย่างน้อย 1 คน';
  end if;
  if p_mode = 'online' and coalesce(p_link, '') !~* '^https?://' then
    raise exception 'กรุณาใส่ลิงก์เข้าสัมภาษณ์ Online ที่ขึ้นต้นด้วย https://';
  end if;
  if p_mode = 'onsite' and coalesce(trim(p_location), '') = '' then raise exception 'กรุณาระบุสถานที่สัมภาษณ์'; end if;
  update candidates set decision = 'นัดสัมภาษณ์แล้ว', interview_status = 'confirmed',
         interview_at = p_at, interview_mode = p_mode, interviewers = p_interviewers,
         interview_location = case when p_mode = 'onsite' then p_location end,
         meeting_link = case when p_mode = 'online' then p_link end,
         project_name = p_project, remark = p_note,
         interview_confirmed_at = now(), interview_confirm_note = p_confirm_note
   where id = p_id
  returning * into r;
  if not found then raise exception 'ไม่พบผู้สมัคร %', p_id; end if;
  if r.location <> 'HR' then
    insert into notifications (recipient, kind, candidate_id, title, body, link)
    values (r.location, 'interview_confirmed', r.id, 'HRS ยืนยันนัดสัมภาษณ์ ' || r.id || ' ' || r.name,
            when_text(p_at) || ' · ' || case when p_mode = 'online' then 'Online' else 'Onsite · ' || p_location end ||
            coalesce(' · ' || nullif(p_confirm_note, ''), ''),
            case when p_mode = 'online' then p_link end);
  end if;
  return r;
end $$;

revoke execute on function public.pjt_pick(text), public.pjt_return(text), public.pjt_set_decision(text, text),
  public.pjt_request_interview(text, timestamptz, text, jsonb, text, text, text),
  public.admin_set_interview(text, timestamptz, text, jsonb, text, text, text, text, text)
  from public, anon;
grant execute on function public.pjt_pick(text), public.pjt_return(text), public.pjt_set_decision(text, text),
  public.pjt_request_interview(text, timestamptz, text, jsonb, text, text, text),
  public.admin_set_interview(text, timestamptz, text, jsonb, text, text, text, text, text)
  to authenticated;

-- Check: the new table exists and is empty for now.
select count(*) as notifications from public.notifications;
