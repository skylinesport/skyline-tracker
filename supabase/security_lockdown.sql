-- ============================================================================
-- Skyline Tracker — SECURITY LOCKDOWN
-- Replaces the old "open to everyone" RLS with "signed-in team only".
--
-- BEFORE this, every table was readable AND writable by anyone with the public
-- anon key (which ships in the browser) — the '1111' passcode was cosmetic only.
-- After this, the anon key alone can read/write NOTHING; a real Supabase Auth
-- login is required (see the new email+password sign-in screen).
--
-- RUN ORDER (important — do not run this until the auth build is deployed):
--   1. Deploy the auth PR (adds the real sign-in screen).
--   2. Supabase -> Authentication -> Sign In / Providers: DISABLE "Allow new
--      users to sign up"  (so randoms can't self-register into the team).
--   3. Supabase -> Authentication -> Users -> Add user: create each teammate
--      (you, Pooja) with email + password, and tick "Auto Confirm User".
--   4. THEN run this file in Supabase -> SQL Editor.
--
-- Re-runnable: it drops whatever policies exist on each table and recreates the
-- authenticated-only one.
-- ============================================================================

-- ── Data tables: authenticated-only, full access ───────────────────────────
do $$
declare
  t    text;
  pol  record;
  tables text[] := array[
    'tasks', 'campus_tasks', 'campus_ambassadors', 'campus_ambassador_columns',
    'migration_tasks', 'links', 'phase2_tasks'
  ];
begin
  foreach t in array tables loop
    begin
      -- drop any existing policy (open or otherwise) on this table
      for pol in
        select policyname from pg_policies where schemaname = 'public' and tablename = t
      loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, t);
      end loop;

      execute format('alter table public.%I enable row level security', t);

      -- only a signed-in user (role "authenticated") may read/write
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        t || '_auth', t
      );
    exception
      when undefined_table then
        raise notice 'skipped missing table: %', t;
    end;
  end loop;
end $$;

-- ── Storage (campus-docs): signed-in team may write; reads stay via the bucket ─
-- Note: the bucket is left public-read for now so existing document links work.
-- Locking reads behind short-lived signed URLs is the recommended follow-up
-- (switch the bucket to private + generate signed URLs in the app). No documents
-- have been uploaded yet, so nothing is exposed today.
drop policy if exists campus_docs_all    on storage.objects;
drop policy if exists campus_docs_read   on storage.objects;
drop policy if exists campus_docs_write  on storage.objects;
drop policy if exists campus_docs_modify on storage.objects;
drop policy if exists campus_docs_delete on storage.objects;

create policy campus_docs_read on storage.objects
  for select using (bucket_id = 'campus-docs');
create policy campus_docs_write on storage.objects
  for insert to authenticated with check (bucket_id = 'campus-docs');
create policy campus_docs_modify on storage.objects
  for update to authenticated using (bucket_id = 'campus-docs') with check (bucket_id = 'campus-docs');
create policy campus_docs_delete on storage.objects
  for delete to authenticated using (bucket_id = 'campus-docs');

-- ── OPTIONAL: tighten further to a named allowlist (defense in depth) ───────
-- If you want ONLY specific emails to pass even among authenticated users,
-- replace the data-table policy body `using (true)` with, e.g.:
--   using (auth.jwt() ->> 'email' in ('you@example.com','pooja@example.com'))
-- With "Allow new users to sign up" disabled, authenticated already == team,
-- so this is optional.
