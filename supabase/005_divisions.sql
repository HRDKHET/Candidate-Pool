-- Candidate Pool — ฝ่าย / แผนก managed by HRS from the website.
-- Run AFTER 004_hold_and_new.sql. Safe to run more than once. Existing data is kept.
--
-- * divisions (ฝ่าย) and units (แผนก) move from the code into the database.
-- * HRS can add a ฝ่าย, and add a แผนก together with its login account + password
--   (admin_create_unit). Account email = lower(unit code) || '@candidate-pool.local'.

-- ---------- tables ----------
create table if not exists public.divisions (
  id          text primary key default gen_random_uuid()::text,
  name        text not null unique,
  sort        int not null default 100,
  created_at  timestamptz not null default now()
);
create table if not exists public.units (
  code         text primary key check (code ~ '^[A-Z0-9][A-Z0-9-]{1,19}$' and code <> 'HR'),
  division_id  text not null references public.divisions (id),
  sort         int not null default 100,
  created_at   timestamptz not null default now()
);

insert into public.divisions (id, name, sort) values ('project', 'ฝ่ายโครงการ', 1) on conflict (id) do nothing;
insert into public.units (code, division_id, sort) values
  ('PJT-PD-1', 'project', 1), ('PJT-PD-2', 'project', 2),
  ('PJT-PD-3', 'project', 3), ('PJT-PD-4', 'project', 4)
on conflict (code) do nothing;

alter table public.divisions enable row level security;
alter table public.units enable row level security;
-- The login page lists ฝ่าย/แผนก before anyone signs in (names only, no candidate data).
drop policy if exists divisions_read on public.divisions;
create policy divisions_read on public.divisions for select to anon, authenticated using (true);
drop policy if exists units_read on public.units;
create policy units_read on public.units for select to anon, authenticated using (true);
drop policy if exists divisions_admin_insert on public.divisions;
create policy divisions_admin_insert on public.divisions for insert to authenticated with check (public.is_admin());
drop policy if exists divisions_admin_update on public.divisions;
create policy divisions_admin_update on public.divisions for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- pools follow the units table instead of a fixed list ----------
alter table public.candidates drop constraint if exists candidates_location_check;
alter table public.profiles drop constraint if exists profiles_unit_check;
alter table public.profiles drop constraint if exists profiles_unit_fk;
alter table public.profiles add constraint profiles_unit_fk foreign key (unit) references public.units (code);

create or replace function public.candidates_valid_location() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.location <> 'HR' and not exists (select 1 from units where code = new.location) then
    raise exception 'ไม่พบแผนก %', new.location;
  end if;
  return new;
end $$;
drop trigger if exists candidates_valid_location on public.candidates;
create trigger candidates_valid_location before insert or update of location on public.candidates
  for each row execute function public.candidates_valid_location();

-- ---------- HRS: create a แผนก with its login account ----------
create or replace function public.admin_create_unit(p_code text, p_division text, p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code  text := upper(trim(p_code));
  v_email text := lower(v_code) || '@candidate-pool.local';
  v_uid   uuid := gen_random_uuid();
begin
  if not is_admin() then raise exception 'เฉพาะ HRS เท่านั้น'; end if;
  if v_code !~ '^[A-Z0-9][A-Z0-9-]{1,19}$' or v_code = 'HR' then
    raise exception 'รหัสแผนกใช้ได้เฉพาะ A–Z, 0–9 และ - ยาว 2–20 ตัว';
  end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว'; end if;
  if not exists (select 1 from divisions where id = p_division) then raise exception 'ไม่พบฝ่ายนี้'; end if;
  if exists (select 1 from units where code = v_code) then raise exception 'มีแผนก % อยู่แล้ว', v_code; end if;
  if exists (select 1 from auth.users where email = v_email) then raise exception 'มีบัญชี % อยู่แล้ว', lower(v_code); end if;

  insert into units (code, division_id) values (v_code, p_division);

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text,
          jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());

  insert into profiles (id, email, role, unit) values (v_uid, v_email, 'pjt', v_code);
end $$;

revoke execute on function public.admin_create_unit(text, text, text) from public, anon;
grant execute on function public.admin_create_unit(text, text, text) to authenticated;

-- Check: should list ฝ่ายโครงการ with its 4 แผนก.
select d.name, string_agg(u.code, ', ' order by u.sort) as units
  from public.divisions d left join public.units u on u.division_id = d.id
 group by d.name;
