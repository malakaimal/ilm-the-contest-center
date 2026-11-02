-- Bring the existing ILM results table up to the columns used by portal.js.
-- Safe to re-run: existing rows are preserved and columns are only added if missing.
create table if not exists public.results (
  id uuid primary key default gen_random_uuid()
);

alter table public.results
  add column if not exists registration_id text,
  add column if not exists student_name text,
  add column if not exists grade text,
  add column if not exists competition text,
  add column if not exists score numeric(8,2),
  add column if not exists total_marks numeric(8,2),
  add column if not exists rank integer,
  add column if not exists result_date date default current_date,
  add column if not exists is_published boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

notify pgrst, 'reload schema';
