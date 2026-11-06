-- ILM Exam Centre: protect administrator role assignment.
-- Run in Supabase SQL Editor after checking the existing profiles table.
-- Removing self-service profile updates prevents users changing their own role.
alter table public.profiles enable row level security;
drop policy if exists "Students can update their own profile" on public.profiles;

-- Promote only your already-registered administrator account.
-- Replace YOUR_ADMIN_EMAIL with the exact account email, then uncomment and run:
-- update public.profiles set role = 'admin' where lower(email) = lower('YOUR_ADMIN_EMAIL');

-- Verify:
-- select id, email, role from public.profiles where lower(email) = lower('YOUR_ADMIN_EMAIL');
