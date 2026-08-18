-- ============================================================================
-- Skyline Tracker — "Links & docs" table.
-- Run this ONCE in Supabase → SQL Editor → New query → Run (same as schema.sql).
-- ============================================================================

create table if not exists public.links (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  url         text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Open access (team edits, no login) — same model as the tasks table.
alter table public.links enable row level security;
drop policy if exists "links read"   on public.links;
drop policy if exists "links write"  on public.links;
drop policy if exists "links update" on public.links;
drop policy if exists "links delete" on public.links;
create policy "links read"   on public.links for select using (true);
create policy "links write"  on public.links for insert with check (true);
create policy "links update" on public.links for update using (true) with check (true);
create policy "links delete" on public.links for delete using (true);

alter publication supabase_realtime add table public.links;

-- Seed a few useful links (only if empty).
insert into public.links (name, url, sort_order)
select * from (values
  ('Production API (health)', 'https://api.skylinesport.in/health', 1),
  ('Admin panel',            'https://api.skylinesport.in/admin/', 2),
  ('Website',                'https://skylinesport.in', 3),
  ('Frontend repo',          'https://github.com/Ayushsvast/skyline-frontend', 4),
  ('Backend repo',           'https://github.com/Ayushsvast/skyline-backend', 5),
  ('Tracker repo',           'https://github.com/ayushnesterlabs/skyline-tracker', 6)
) as seed(name, url, sort_order)
where not exists (select 1 from public.links);
