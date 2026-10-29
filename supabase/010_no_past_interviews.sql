-- Candidate Pool — an interview can only be requested or confirmed for a time still ahead of now.
-- Run AFTER 009_dimension_scores.sql. Safe to run more than once. Existing data is kept.
--
-- Same two functions as 003_interviews_notifications.sql, plus one check each (marked "new").
-- Interviews already in the table are not touched; only new requests / confirmations are checked,
-- so HRS must move a request whose time has passed to a new time before confirming it.

create or replace function public.pjt_request_interview(
  p_id text, p_at timestamptz, p_mode text, p_interviewers jsonb,
  p_location text, p_project text, p_note text) returns public.candidates
language plpgsql security definer set search_path = public as $$
declare u text := my_unit(); r candidates;
begin
  if u is null then raise exception 'บัญชีนี้ไม่มีสิทธิ์'; end if;
  if p_at is null then raise exception 'กรุณาระบุวันและเวลาสัมภาษณ์'; end if;
  -- new
  if p_at <= now() then raise exception 'วันและเวลานี้ผ่านไปแล้ว กรุณาเลือกวันและเวลาที่ยังไม่ถึง'; end if;
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

create or replace function public.admin_set_interview(
  p_id text, p_at timestamptz, p_mode text, p_interviewers jsonb, p_location text,
  p_link text, p_project text, p_note text, p_confirm_note text) returns public.candidates
language plpgsql security definer set search_path = public as $$
declare r candidates;
begin
  if not is_admin() then raise exception 'เฉพาะ HRS เท่านั้น'; end if;
  if p_at is null then raise exception 'กรุณาระบุวันและเวลาสัมภาษณ์'; end if;
  -- new
  if p_at <= now() then raise exception 'วันและเวลานี้ผ่านไปแล้ว กรุณาเลือกวันและเวลาที่ยังไม่ถึง'; end if;
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

revoke execute on function
  public.pjt_request_interview(text, timestamptz, text, jsonb, text, text, text),
  public.admin_set_interview(text, timestamptz, text, jsonb, text, text, text, text, text)
  from public, anon;
grant execute on function
  public.pjt_request_interview(text, timestamptz, text, jsonb, text, text, text),
  public.admin_set_interview(text, timestamptz, text, jsonb, text, text, text, text, text)
  to authenticated;

-- Check: two rows, both with has_past_check = true.
select proname, prosrc like '%p_at <= now()%' as has_past_check
  from pg_proc where proname in ('pjt_request_interview', 'admin_set_interview') order by proname;
