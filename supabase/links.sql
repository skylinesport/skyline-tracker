-- ============================================================================
-- Skyline Tracker — "Links & docs" table.
-- Run this ONCE in Supabase → SQL Editor → New query → Run (same as schema.sql).
-- Idempotent + no quoted identifiers (avoids smart-quote paste issues).
-- ============================================================================

create table if not exists public.links (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  url        text not null default '',
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

alter table public.links enable row level security;

do $$
begin
  -- Open access (team edits, no login): one policy covering read/write/update/delete.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'links' and policyname = 'links_all'
  ) then
    create policy links_all on public.links for all using (true) with check (true);
  end if;

  -- Live updates for everyone.
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'links'
  ) then
    alter publication supabase_realtime add table public.links;
  end if;
end $$;

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
