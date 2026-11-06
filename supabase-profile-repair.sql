-- ILM student profile repair and Auth linking migration
-- Run this once in Supabase Dashboard > SQL Editor.
-- It replaces legacy profile-creation triggers with ONE trigger and backfills
-- missing profiles for existing Auth users. It does not delete student rows.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete cascade,
  registration_id text unique,
  full_name text,
  email text,
  grade text,
  school_name text,
  role text not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists id uuid;
alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists registration_id text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists grade text;
alter table public.profiles add column if not exists school_name text;
alter table public.profiles add column if not exists role text default 'student';
alter table public.profiles add column if not exists created_at timestamptz default now();

create unique index if not exists profiles_id_uidx on public.profiles(id);
create unique index if not exists profiles_user_id_uidx on public.profiles(user_id);
create unique index if not exists profiles_registration_id_uidx on public.profiles(registration_id);

-- Remove previously used trigger names to prevent two profile writers running
-- for the same Auth user and causing a unique-key failure.
drop trigger if exists ilm_auth_user_profile_created on auth.users;
drop trigger if exists ilm_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.ilm_create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_registration_id text;
begin
  new_registration_id := 'ILM' || to_char(now(), 'YYYY') || '-' ||
                         upper(substr(replace(new.id::text, '-', ''), 1, 8));

  insert into public.profiles
    (id, user_id, registration_id, full_name, email, grade, school_name, role)
  values
    (new.id, new.id, new_registration_id,
     coalesce(new.raw_user_meta_data->>'full_name', ''),
     new.email,
     coalesce(new.raw_user_meta_data->>'grade', ''),
     coalesce(new.raw_user_meta_data->>'school_name', ''),
     'student')
  on conflict (id) do update set
    user_id = excluded.user_id,
    full_name = excluded.full_name,
    email = excluded.email,
    grade = excluded.grade,
    school_name = excluded.school_name;

  return new;
end;
$$;

create trigger ilm_auth_user_profile_created
after insert on auth.users
for each row execute procedure public.ilm_create_student_profile();

-- Repair links on existing profile rows that already have an Auth user.
update public.profiles
set user_id = id
where user_id is null and id is not null;

update public.profiles
set registration_id = 'ILM' || to_char(now(), 'YYYY') || '-' ||
  upper(substr(replace(id::text, '-', ''), 1, 8))
where (registration_id is null or registration_id = '') and id is not null;

-- Backfill profiles for Auth users created before the trigger was repaired.
insert into public.profiles
  (id, user_id, registration_id, full_name, email, grade, school_name, role)
select
  u.id,
  u.id,
  'ILM' || to_char(coalesce(u.created_at, now()), 'YYYY') || '-' ||
    upper(substr(replace(u.id::text, '-', ''), 1, 8)),
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  u.email,
  coalesce(u.raw_user_meta_data->>'grade', ''),
  coalesce(u.raw_user_meta_data->>'school_name', ''),
  'student'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists "Students can read their own profile" on public.profiles;
create policy "Students can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);

-- Students must not be able to change their role or other protected fields.
drop policy if exists "Students can update their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Allow profile updates" on public.profiles;
revoke update on table public.profiles from anon;
revoke update on table public.profiles from authenticated;

commit;

-- Verify profile creation and Auth linking:
select p.registration_id, p.full_name, p.email, p.user_id, u.id as auth_user_id
from public.profiles p
join auth.users u on u.id = p.user_id
order by p.created_at desc
limit 20;
