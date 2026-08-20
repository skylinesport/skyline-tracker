-- ============================================================================
-- Skyline Tracker — "Campus Ambassador" checklist table.
-- Run this ONCE in Supabase -> SQL Editor -> New query -> Run.
-- Idempotent + no apostrophes in seed text (avoids smart-quote paste issues).
-- ============================================================================

create table if not exists public.campus_tasks (
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

alter table public.campus_tasks enable row level security;

drop policy if exists campus_tasks_all on public.campus_tasks;
create policy campus_tasks_all on public.campus_tasks for all using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.campus_tasks;
exception when duplicate_object then null;
end $$;

-- A few starter items (only if empty) — edit or delete them from the page.
insert into public.campus_tasks (phase, service, task, owner, notes, sort_order)
select * from (values
  ('1 - Setup', 'Program brief', 'Define perks, referral rewards, duration and target colleges', 'Ayush', 'The one-pager ambassadors sign up to.', 1),
  ('1 - Setup', 'Application form', 'Create the ambassador application form (Google Form or Tally)', 'Pooja', '', 2),
  ('2 - Recruitment', 'Outreach', 'Share the form in college groups and student communities', 'Pooja', '', 3),
  ('3 - Onboarding', 'Welcome kit', 'Welcome message, WhatsApp group and referral code for each ambassador', 'Ayush', '', 4)
) as seed(phase, service, task, owner, notes, sort_order)
where not exists (select 1 from public.campus_tasks);
