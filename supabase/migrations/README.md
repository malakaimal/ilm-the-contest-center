# Supabase migrations

Place each reviewed database change in this folder as a timestamped SQL file,
for example:

`20261102090000_add_student_admissions.sql`

GitHub Actions applies pending migrations to the linked Supabase project when
a migration is pushed to `main`, or when the workflow is started manually.

## Required GitHub Actions repository secrets

Add these under GitHub → repository Settings → Secrets and variables →
Actions → New repository secret:

- `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token.
- `SUPABASE_PROJECT_ID`: `yofdwdnahepnnlbhiuzf`.
- `SUPABASE_DB_PASSWORD`: the database password for this Supabase project.

Never put these values in source files or commit them to GitHub. Do not use a
Supabase service-role key or expose database credentials in browser JavaScript.

## Safety

Migrations run against the configured production project. Review and back up
the database before applying migrations that alter or remove data. Do not add
destructive SQL unless the impact has been checked and explicitly approved.
