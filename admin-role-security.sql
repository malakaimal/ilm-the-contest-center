-- ILM Exam/Admin security hardening for Supabase profiles.
-- Run in Supabase SQL Editor. Review existing policies before applying.
-- IMPORTANT: this intentionally disables student self-service profile updates,
-- because a broad UPDATE policy could let a student change their own role to admin.

begin;

alter table public.profiles enable row level security;

drop policy if exists "Students can update their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Allow profile updates" on public.profiles;

revoke update on table public.profiles from anon;
revoke update on table public.profiles from authenticated;

-- Keep each signed-in user able to read only their own profile.
drop policy if exists "Students can read their own profile" on public.profiles;
create policy "Students can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);

commit;

-- Promote an existing, trusted administrator manually in SQL Editor only:
-- update public.profiles set role = 'admin'
-- where lower(email) = lower('YOUR_ADMIN_EMAIL');
--
-- Verify:
-- select id, email, role from public.profiles
-- where lower(email) = lower('YOUR_ADMIN_EMAIL');
