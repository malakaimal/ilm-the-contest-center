-- ILM results table compatibility repair
-- Run once in Supabase SQL Editor. This preserves existing result records.
alter table public.results
  add column if not exists competition text;

-- Ask Supabase/PostgREST to refresh its schema cache.
notify pgrst, 'reload schema';
