-- ============================================================================
-- Skyline Tracker — Phase 2 kanban. Run ONCE in Supabase → SQL Editor.
-- Creates the phase2_tasks table, opens it for the app (no login), enables
-- realtime, and seeds it with the Phase 2 rollout milestones (Stage A/B/C).
-- Safe to re-run: it only creates if missing and only seeds when empty.
-- ============================================================================

create table if not exists public.phase2_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  stage       text not null default 'A',           -- A (Pilot) | B (Regional) | C (National)
  status      text not null default 'todo',        -- todo | in_progress | blocked | done
  notes       text default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Open access: anyone with the app can read + write (same model as tasks).
alter table public.phase2_tasks enable row level security;

drop policy if exists "p2 open read"   on public.phase2_tasks;
drop policy if exists "p2 open write"  on public.phase2_tasks;
drop policy if exists "p2 open update" on public.phase2_tasks;
drop policy if exists "p2 open delete" on public.phase2_tasks;

create policy "p2 open read"   on public.phase2_tasks for select using (true);
create policy "p2 open write"  on public.phase2_tasks for insert with check (true);
create policy "p2 open update" on public.phase2_tasks for update using (true) with check (true);
create policy "p2 open delete" on public.phase2_tasks for delete using (true);

-- Live updates across the whole team.
alter publication supabase_realtime add table public.phase2_tasks;

-- ---- Seed (only if empty) --------------------------------------------------
insert into public.phase2_tasks (title, stage, status, sort_order)
select * from (values
  -- Stage A · Pilot (one city, done deeply)
  ('Define the beachhead city + target colleges',                            'A', 'todo', 1),
  ('Recruit the first cohort of Campus Ambassadors as club founders',        'A', 'todo', 2),
  ('Launch 3–5 flagship clubs in one beachhead city',                        'A', 'todo', 3),
  ('Run recurring weekly tournaments + one college-fest activation',         'A', 'todo', 4),
  ('Measure the unit: join rate, tournaments per club, retention',           'A', 'todo', 5),
  -- Stage B · Regional (repeat the unit, city by city)
  ('Ship the self-serve "how to start a Skyline club" kit',                  'B', 'todo', 10),
  ('Close the first brand-sponsored tournament + campus activation deal',    'B', 'todo', 11),
  ('Set up the semester-league calendar with leadership succession',         'B', 'todo', 12),
  ('Ship squads/clans + persistent group chat in-app',                       'B', 'todo', 13),
  ('Clip / UGC sharing for players',                                         'B', 'todo', 14),
  -- Stage C · National (a club in every college)
  ('Scale the playbook to new cities with minimal central lift',             'C', 'todo', 20),
  ('Build the talent pipeline: scouting, team placement, creator deals',     'C', 'todo', 21),
  ('Layer in monetization — cosmetics, then rewarded ads, then subscription','C', 'todo', 22),
  ('Run a national league with regional qualifiers',                         'C', 'todo', 23)
) as seed(title, stage, status, sort_order)
where not exists (select 1 from public.phase2_tasks);
