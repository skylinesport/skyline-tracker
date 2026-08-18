-- ============================================================================
-- Skyline Tracker — run this ONCE in Supabase → SQL Editor → New query → Run.
-- Creates the tasks table, opens it for the app (no login), enables realtime,
-- and seeds it with the current Skyline status.
-- ============================================================================

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  area        text not null default 'Backend',   -- Backend | Frontend | Infra | Launch
  status      text not null default 'todo',       -- todo | in_progress | blocked | done
  priority    text not null default 'P1',          -- P0 | P1 | P2
  notes       text default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Open access: anyone with the app can read + write (you chose "open link").
-- The anon key is public by design; keep the tracker URL private to your team.
alter table public.tasks enable row level security;

drop policy if exists "open read"   on public.tasks;
drop policy if exists "open write"  on public.tasks;
drop policy if exists "open update" on public.tasks;
drop policy if exists "open delete" on public.tasks;

create policy "open read"   on public.tasks for select using (true);
create policy "open write"  on public.tasks for insert with check (true);
create policy "open update" on public.tasks for update using (true) with check (true);
create policy "open delete" on public.tasks for delete using (true);

-- Live updates across the whole team.
alter publication supabase_realtime add table public.tasks;

-- ---- Seed (only if empty) --------------------------------------------------
insert into public.tasks (title, area, status, priority, sort_order)
select * from (values
  -- Completed
  ('Backend API (NestJS + Prisma + Redis): auth, tournaments, rewards, admin', 'Backend',  'done', 'P0', 1),
  ('Username at signup + live availability check; 8-char password rule',        'Backend',  'done', 'P1', 2),
  ('Deployed to Railway (Postgres + Redis, migrate-on-boot, healthy)',          'Infra',    'done', 'P0', 3),
  ('Database seeded (admin + demo tournaments)',                                'Infra',    'done', 'P1', 4),
  ('Admin panel live + admin password changed',                                 'Infra',    'done', 'P1', 5),
  ('Custom domain api.skylinesport.in with HTTPS',                              'Infra',    'done', 'P0', 6),
  ('Database public access closed (internal-only)',                             'Infra',    'done', 'P1', 7),
  ('Repos moved to new GitHub account, PRs merged',                             'Infra',    'done', 'P2', 8),
  ('App: auth, onboarding, tournaments, rewards, profile, premium funnel',      'App', 'done', 'P0', 9),
  ('App wired to production backend; auth route guard; real error messages',    'App', 'done', 'P1', 10),
  -- To do (P0 — launch blockers)
  ('Build Android APK / production app (EAS) + store submission',               'Launch',   'todo', 'P0', 11),
  ('Fix or hide Google sign-in (currently sends empty token)',                  'App', 'todo', 'P0', 12),
  ('Wire real SMS (MSG91) for phone OTP — codes only hit logs now',             'Backend',  'todo', 'P0', 13),
  ('Wire email SMTP for password reset — only logs now',                        'Backend',  'todo', 'P0', 14),
  -- To do (P1 — pre-launch hardening)
  ('Rotate Postgres password',                                                  'Infra',    'todo', 'P1', 15),
  ('Tighten CORS_ORIGINS (only if a web client is added)',                      'Backend',  'todo', 'P1', 16),
  ('Real avatar hosting + upload (replace pravatar placeholders)',              'App', 'todo', 'P1', 17),
  ('Privacy policy + store listing assets',                                     'Launch',   'todo', 'P1', 18),
  -- Nice-to-have (P2)
  ('Friendly root route (/ instead of "Cannot GET /")',                         'Backend',  'todo', 'P2', 19),
  ('Avatar image-load fallback to initials',                                    'App', 'todo', 'P2', 20),
  ('CI/CD + basic monitoring/backups',                                          'Infra',    'todo', 'P2', 21),
  -- Website
  ('Landing page (hero, features, call-to-action)',                             'Website',  'todo', 'P0', 31),
  ('Connect skylinesport.in domain + hosting',                                  'Website',  'todo', 'P0', 32),
  ('App download links (App Store / Play Store badges)',                        'Website',  'todo', 'P1', 33),
  ('Privacy Policy + Terms pages',                                              'Website',  'todo', 'P0', 34),
  ('SEO: meta tags + social share preview',                                     'Website',  'todo', 'P2', 35),
  ('Contact / support page',                                                    'Website',  'todo', 'P2', 36)
) as seed(title, area, status, priority, sort_order)
where not exists (select 1 from public.tasks);
