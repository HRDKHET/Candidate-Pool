-- Candidate Pool — account login (pick an account + password, no email typed).
-- Run AFTER schema.sql, and after creating the 5 users below in
-- Authentication › Users › Add user (tick "Auto Confirm User").
--
--   admin-hr@candidate-pool.local   -> Admin (HR)
--   pjt-pd-1@candidate-pool.local   -> PJT-PD-1
--   pjt-pd-2@candidate-pool.local   -> PJT-PD-2
--   pjt-pd-3@candidate-pool.local   -> PJT-PD-3
--   pjt-pd-4@candidate-pool.local   -> PJT-PD-4
--
-- These addresses only identify the accounts; no email is ever sent to them.
-- Safe to run more than once.

-- Link each account to its role / pool.
insert into public.profiles (id, email, role, unit)
select u.id, u.email, a.role, a.unit
from auth.users u
join (values
  ('admin-hr@candidate-pool.local', 'admin', null),
  ('pjt-pd-1@candidate-pool.local', 'pjt', 'PJT-PD-1'),
  ('pjt-pd-2@candidate-pool.local', 'pjt', 'PJT-PD-2'),
  ('pjt-pd-3@candidate-pool.local', 'pjt', 'PJT-PD-3'),
  ('pjt-pd-4@candidate-pool.local', 'pjt', 'PJT-PD-4')
) as a(email, role, unit) on lower(u.email) = a.email
on conflict (id) do update set role = excluded.role, unit = excluded.unit;

-- Lets the admin set a new password for any account from the website.
create or replace function public.admin_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'เฉพาะ Admin เท่านั้นที่ตั้งรหัสผ่านได้'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว'; end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user;
  if not found then raise exception 'ไม่พบบัญชีนี้'; end if;
end $$;

revoke execute on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

-- Check: should list 5 rows.
select email, role, unit, active from public.profiles order by role, unit;
