-- ILM Student Authentication setup
-- Run this in Supabase Dashboard > SQL Editor > New query.
-- This creates/extends the student profile table used by portal.js.

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

create or replace function public.ilm_create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = public
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

drop trigger if exists ilm_auth_user_profile_created on auth.users;
create trigger ilm_auth_user_profile_created
after insert on auth.users
for each row execute procedure public.ilm_create_student_profile();

alter table public.profiles enable row level security;

drop policy if exists "Students can read their own profile" on public.profiles;
create policy "Students can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Students can update their own profile" on public.profiles;
create policy "Students can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
