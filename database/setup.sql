
-- ILM The Contest Center: run this complete script once in Supabase SQL Editor.
create sequence if not exists public.ilm_registration_seq start 1;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  registration_id text unique,
  full_name text not null default '',
  father_name text,
  email text,
  phone text,
  district text,
  school_name text,
  grade text,
  program_interest text,
  role text not null default 'student' check (role in ('student','admin','super_admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  grade_range text,
  status text not null default 'upcoming' check(status in ('draft','upcoming','open','completed')),
  start_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  registration_id text not null,
  student_name text not null,
  grade text,
  competition text not null,
  score numeric(8,2) not null check(score >= 0),
  total_marks numeric(8,2) not null check(total_marks > 0 and score <= total_marks),
  rank integer check(rank is null or rank > 0),
  result_date date not null default current_date,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_no text unique not null,
  registration_id text not null,
  student_name text not null,
  program text not null,
  issued_on date not null default current_date,
  verification_status text not null default 'valid' check(verification_status in ('valid','revoked')),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default 'General enquiry',
  message text not null,
  created_at timestamptz not null default now()
);

create or replace function public.ilm_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where user_id = auth.uid() and role in ('admin','super_admin')); $$;

create or replace function public.ilm_new_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
declare n bigint;
begin
  n := nextval('public.ilm_registration_seq');
  insert into public.profiles(user_id,registration_id,full_name,father_name,email,phone,district,school_name,grade,program_interest)
  values(new.id,'ILM-'||to_char(now(),'YYYY')||'-'||lpad(n::text,6,'0'),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.raw_user_meta_data->>'father_name',new.email,
    new.raw_user_meta_data->>'phone',new.raw_user_meta_data->>'district',
    new.raw_user_meta_data->>'school_name',new.raw_user_meta_data->>'grade',
    new.raw_user_meta_data->>'program_interest')
  on conflict(user_id) do nothing;
  return new;
end; $$;

drop trigger if exists ilm_auth_user_created on auth.users;
create trigger ilm_auth_user_created after insert on auth.users
for each row execute procedure public.ilm_new_profile();

create or replace function public.verify_ilm_certificate(p_certificate_no text)
returns table(certificate_no text, student_name text, program text, issued_on date)
language sql stable security definer set search_path = public
as $$ select c.certificate_no,c.student_name,c.program,c.issued_on
from public.certificates c
where upper(c.certificate_no)=upper(trim(p_certificate_no))
and c.verification_status='valid'
limit 1; $$;

alter table public.profiles enable row level security;
alter table public.competitions enable row level security;
alter table public.results enable row level security;
alter table public.certificates enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "profile owner or admin reads" on public.profiles;
create policy "profile owner or admin reads" on public.profiles for select to authenticated
using (user_id=auth.uid() or public.ilm_is_admin());
-- Profiles are read-only from the browser. This prevents students from
-- changing their registration ID or promoting themselves to an admin.
drop policy if exists "profile owner updates" on public.profiles;

-- Explicit least-privilege grants. RLS policies alone do not remove SQL grants.
revoke all on public.profiles, public.competitions, public.results,
  public.certificates, public.contact_messages from anon, authenticated;

grant select on public.competitions, public.results to anon, authenticated;
grant select on public.profiles, public.certificates to authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
grant insert, update, delete on public.competitions, public.results, public.certificates to authenticated;
grant execute on function public.verify_ilm_certificate(text) to anon, authenticated;
grant execute on function public.ilm_is_admin() to authenticated;

drop policy if exists "public reads non draft competitions" on public.competitions;
create policy "public reads non draft competitions" on public.competitions for select to anon,authenticated using(status <> 'draft');
drop policy if exists "admin manages competitions" on public.competitions;
create policy "admin manages competitions" on public.competitions for all to authenticated using(public.ilm_is_admin()) with check(public.ilm_is_admin());

drop policy if exists "public reads published results" on public.results;
create policy "public reads published results" on public.results for select to anon,authenticated using(is_published=true);
drop policy if exists "student reads own results" on public.results;
create policy "student reads own results" on public.results for select to authenticated
using(exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.registration_id=results.registration_id));
drop policy if exists "admin manages results" on public.results;
create policy "admin manages results" on public.results for all to authenticated using(public.ilm_is_admin()) with check(public.ilm_is_admin());

drop policy if exists "student reads own certificates" on public.certificates;
create policy "student reads own certificates" on public.certificates for select to authenticated
using(exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.registration_id=certificates.registration_id));
drop policy if exists "admin manages certificates" on public.certificates;
create policy "admin manages certificates" on public.certificates for all to authenticated using(public.ilm_is_admin()) with check(public.ilm_is_admin());

drop policy if exists "public can submit enquiries" on public.contact_messages;
create policy "public can submit enquiries" on public.contact_messages for insert to anon,authenticated
with check(length(trim(name)) between 1 and 100 and length(trim(email)) between 3 and 180 and length(trim(message)) between 1 and 1500);
drop policy if exists "admin reads enquiries" on public.contact_messages;
create policy "admin reads enquiries" on public.contact_messages for select to authenticated using(public.ilm_is_admin());

grant usage on schema public to anon,authenticated;
grant select on public.competitions to anon,authenticated;
grant select on public.results to anon,authenticated;
grant select on public.profiles,public.certificates to authenticated;
grant insert on public.contact_messages to anon,authenticated;
grant select on public.contact_messages to authenticated;
grant insert,update,delete on public.competitions,public.results,public.certificates to authenticated;
grant execute on function public.verify_ilm_certificate(text) to anon,authenticated;
grant execute on function public.ilm_is_admin() to authenticated;

-- After you create your own account, grant admin access from this SQL Editor.
-- Replace the email below with the project owner's verified sign-in email.
-- update public.profiles set role='admin' where email='YOUR-ADMIN-EMAIL';
