-- ILM results table compatibility repair
-- Safe to run more than once. Adds missing columns without deleting existing rows.
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

-- Ask Supabase/PostgREST to refresh its schema cache.
notify pgrst, 'reload schema';
