-- ============================================================================
-- Skyline Tracker — "Account migration" checklist table.
-- Moving every service off a personal email onto a company-owned identity.
-- Run this ONCE in Supabase → SQL Editor → New query → Run (same as schema.sql).
-- Idempotent + no quoted identifiers (avoids smart-quote paste issues).
-- ============================================================================

create table if not exists public.migration_tasks (
  id         uuid primary key default gen_random_uuid(),
  phase      text not null default '',
  service    text not null default '',
  task       text not null default '',
  owner      text not null default '',
  notes      text not null default '',
  done       boolean not null default false,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

alter table public.migration_tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'migration_tasks' and policyname = 'migration_tasks_all'
  ) then
    create policy migration_tasks_all on public.migration_tasks for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'migration_tasks'
  ) then
    alter publication supabase_realtime add table public.migration_tasks;
  end if;
end $$;

-- Seed the checklist (only if empty). Phases run top → bottom by priority.
insert into public.migration_tasks (phase, service, task, owner, notes, sort_order)
select * from (values
  -- Phase 0 · Foundation (do these first — everything else depends on them)
  ('0 · Foundation', 'Company email', 'Create admin@skylinesport.in (Google Workspace on the domain you already own)', 'Ayush', 'One shared identity that OWNS every other account — not a personal Gmail.', 1),
  ('0 · Foundation', 'Password manager', 'Set up a team vault (1Password / Bitwarden), enable 2FA everywhere, store recovery codes', 'Ayush + Pooja', 'So access never lives in one person''s browser or memory.', 2),

  -- Phase 1 · Critical (the crown jewels — lose these, lose the company)
  ('1 · Critical', 'Domain (GoDaddy)', 'Move to the company email, enable 2FA + domain lock', 'Ayush', 'Losing the registrar = losing the website AND all @skylinesport.in email. Do this first.', 3),
  ('1 · Critical', 'GitHub', 'Create an Organization; transfer skyline-app, skyline-backend, SkyLine-Web, skyline-tracker', 'Ayush', 'Repos currently under the personal Ayushsvast account.', 4),

  -- Phase 2 · Infrastructure
  ('2 · Infrastructure', 'Railway', 'Create a Team, set company email as owner, invite Pooja', 'Ayush', 'Hosts the backend, Postgres and Redis.', 5),
  ('2 · Infrastructure', 'Vercel', 'Create a Team; transfer the website + tracker projects', 'Ayush', 'Hosts skylinesport.in and this tracker.', 6),
  ('2 · Infrastructure', 'Resend', 'Set company email as owner; re-verify the sending domain under it', 'Ayush', 'Sends OTP / reset / welcome email.', 7),

  -- Phase 3 · App & identity
  ('3 · App & identity', 'Google Cloud (OAuth)', 'Move the project under an org / add company email as owner (keep the client IDs)', 'Ayush', 'Powers Google Sign-in; client IDs are already wired.', 8),
  ('3 · App & identity', 'Expo / EAS', 'Create an Organization; transfer the project from the personal poojanesterlabs account', 'Pooja', 'The app builds currently live under Pooja''s personal Expo account.', 9),
  ('3 · App & identity', 'Apple Developer', 'Open an Organization account (needs a D-U-N-S number) — not a personal one', 'Ayush + Pooja', 'Owns app signing + push forever, and is required for App Store + iOS push.', 10),

  -- Phase 4 · Hygiene
  ('4 · Hygiene', 'Billing', 'Put a company card + company email on every service''s invoices', 'Ayush', 'Keeps company finances separate from personal.', 11),
  ('4 · Hygiene', '2FA audit', 'Confirm 2FA is on for every account; recovery codes saved in the vault', 'Ayush + Pooja', 'Final pass once everything is moved.', 12)
) as seed(phase, service, task, owner, notes, sort_order)
where not exists (select 1 from public.migration_tasks);
