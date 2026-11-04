-- ============================================================================
-- Skyline Tracker — "Campus Ambassador Dashboard" (ambassador roster).
-- Run this ONCE in Supabase -> SQL Editor -> New query -> Run.
-- Idempotent + safe to re-run.
--
-- Model is deliberately SCHEMA-LESS so columns can be added from the UI later
-- without a migration:
--   * campus_ambassador_columns  — the column definitions (label + order)
--   * campus_ambassadors         — one row per ambassador; cell values live in
--                                  a `data` JSONB keyed by column id, plus the
--                                  per-row uploaded document fields.
-- A Storage bucket `campus-docs` holds one document per ambassador.
-- ============================================================================

-- ── Columns (dynamic headers) ──────────────────────────────────────────────
create table if not exists public.campus_ambassador_columns (
  id         uuid primary key default gen_random_uuid(),
  label      text not null default 'Column',
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- ── Ambassadors (rows) ─────────────────────────────────────────────────────
create table if not exists public.campus_ambassadors (
  id         uuid primary key default gen_random_uuid(),
  data       jsonb not null default '{}'::jsonb,  -- { "<column id>": "value", ... }
  doc_url    text,                                -- public URL of the uploaded doc
  doc_name   text,                                -- original filename (for display)
  doc_path   text,                                -- storage path (for replace/delete)
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

-- ── Open RLS (internal, passcode-gated tool using the anon key) ─────────────
alter table public.campus_ambassador_columns enable row level security;
alter table public.campus_ambassadors        enable row level security;

drop policy if exists campus_ambassador_columns_all on public.campus_ambassador_columns;
create policy campus_ambassador_columns_all on public.campus_ambassador_columns
  for all using (true) with check (true);

drop policy if exists campus_ambassadors_all on public.campus_ambassadors;
create policy campus_ambassadors_all on public.campus_ambassadors
  for all using (true) with check (true);

-- ── Realtime (changes sync for everyone, like the rest of the tracker) ──────
do $$ begin
  alter publication supabase_realtime add table public.campus_ambassador_columns;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.campus_ambassadors;
exception when duplicate_object then null; end $$;

-- ── Seed the starting columns (only if none exist yet) ──────────────────────
insert into public.campus_ambassador_columns (label, sort_order)
select v.label, v.sort_order
from (values
  ('Name', 1),
  ('Contact', 2),
  ('College', 3),
  ('Semester', 4),
  ('Manager', 5)
) as v(label, sort_order)
where not exists (select 1 from public.campus_ambassador_columns);

-- ── Storage: one document per ambassador ────────────────────────────────────
-- Public bucket so the saved doc_url opens directly. The tracker is already
-- behind a passcode and the bucket name/paths are not guessable in practice.
insert into storage.buckets (id, name, public)
values ('campus-docs', 'campus-docs', true)
on conflict (id) do nothing;

-- Allow the anon key to upload / read / replace / delete within this bucket.
drop policy if exists campus_docs_all on storage.objects;
create policy campus_docs_all on storage.objects
  for all
  using  (bucket_id = 'campus-docs')
  with check (bucket_id = 'campus-docs');
