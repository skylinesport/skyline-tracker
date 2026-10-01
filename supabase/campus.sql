-- ============================================================================
-- Skyline Tracker — "Campus Ambassador" checklist table.
-- Run this ONCE in Supabase -> SQL Editor -> New query -> Run.
-- Idempotent + no apostrophes in seed text (avoids smart-quote paste issues).
-- Safe to re-run: adds the status column if missing and inserts only the
-- tasks that are not already present (matched by task text).
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

-- Status: todo | in_progress | blocked | done (checkbox = done). Keeps `done`
-- for back-compat; the page keeps both in sync.
alter table public.campus_tasks add column if not exists status text not null default 'todo';

alter table public.campus_tasks enable row level security;

drop policy if exists campus_tasks_all on public.campus_tasks;
create policy campus_tasks_all on public.campus_tasks for all using (true) with check (true);

do $$ begin
  alter publication supabase_realtime add table public.campus_tasks;
exception when duplicate_object then null;
end $$;

-- Remove the old placeholder starter items (if still present).
delete from public.campus_tasks where task in (
  'Define perks, referral rewards, duration and target colleges',
  'Create the ambassador application form (Google Form or Tally)',
  'Share the form in college groups and student communities',
  'Welcome message, WhatsApp group and referral code for each ambassador'
);

-- Seed the full plan. Each row inserts only if that task is not already there.
insert into public.campus_tasks (phase, task, owner, notes, status, done, sort_order)
select v.phase, v.task, v.owner, v.notes, 'todo', false, v.sort_order
from (values
  -- 1 — Program Design
  ('1 - Program Design', 'Define perks, duration, hours per week and cohort size', 'Ayush', '', 1),
  ('1 - Program Design', 'Define the tier system: rank thresholds and what each unlocks', 'Ayush', 'Deck slide 6 is empty — fill the ladder.', 2),
  ('1 - Program Design', 'Pick target colleges / regions for the founding cohort', 'Ayush', '', 3),
  ('1 - Program Design', 'Set the budget (swag, jersey, printing, shipping, prizes)', 'Ayush', '', 4),
  ('1 - Program Design', 'Assign a program manager / single point of contact', 'Ayush', '', 5),
  ('1 - Program Design', 'Decide cohort start date and application deadline', 'Ayush', '', 6),
  ('1 - Program Design', 'Finalize the program one-pager / brief (fill the deck TBDs)', 'Pooja', '', 7),
  -- 2 — Legal & Docs
  ('2 - Legal & Docs', 'Offer / appointment letter template', '', '', 8),
  ('2 - Legal & Docs', 'Ambassador agreement + code of conduct (no-gambling, brand, privacy, IP)', '', '', 9),
  ('2 - Legal & Docs', 'Certificate of completion template', '', '', 10),
  ('2 - Legal & Docs', 'Reference / recommendation letter template', '', '', 11),
  ('2 - Legal & Docs', 'Ambassador playbook / handbook (how to run events, scripts, FAQs)', 'Pooja', '', 12),
  -- 3 — Brand & Marketing Assets
  ('3 - Brand & Marketing Assets', 'Logo pack (PNG/SVG, light and dark)', '', '', 13),
  ('3 - Brand & Marketing Assets', 'Printable posters (A3/A4) with QR and referral code', '', '', 14),
  ('3 - Brand & Marketing Assets', 'Instagram story and post templates', '', '', 15),
  ('3 - Brand & Marketing Assets', 'WhatsApp status image', '', '', 16),
  ('3 - Brand & Marketing Assets', 'Short reel / video template', '', '', 17),
  ('3 - Brand & Marketing Assets', 'Ready-to-paste captions', '', '', 18),
  ('3 - Brand & Marketing Assets', 'Per-ambassador referral code, link and QR', '', '', 19),
  ('3 - Brand & Marketing Assets', 'Jersey / T-shirt design, sizes and vendor', '', '', 20),
  ('3 - Brand & Marketing Assets', 'Stickers', '', '', 21),
  ('3 - Brand & Marketing Assets', 'Physical ID card / badge and lanyard', '', '', 22),
  ('3 - Brand & Marketing Assets', 'Event standee / banner', '', '', 23),
  ('3 - Brand & Marketing Assets', 'LinkedIn headline + email signature graphic', '', '', 24),
  ('3 - Brand & Marketing Assets', 'Short college-approach pitch deck (for clubs and fests)', '', '', 25),
  -- 4 — In-App & Tech
  ('4 - In-App & Tech', 'In-app ambassador badge', '', '', 26),
  ('4 - In-App & Tech', 'Exclusive ambassador cosmetics', '', '', 27),
  ('4 - In-App & Tech', 'Ambassador leaderboard (signups / events / squads)', '', '', 28),
  ('4 - In-App & Tech', 'Wire referral attribution per ambassador', '', 'Uses the existing referral engine.', 29),
  ('4 - In-App & Tech', 'Tier progression logic (unlocks by rank)', '', '', 30),
  ('4 - In-App & Tech', 'Ambassador stats view / dashboard', '', '', 31),
  -- 5 — Recruitment & Selection
  ('5 - Recruitment & Selection', 'Build the application form (Google Form / Tally)', 'Pooja', '', 32),
  ('5 - Recruitment & Selection', 'Write the selection rubric / scoring', '', '', 33),
  ('5 - Recruitment & Selection', 'Outreach: share the form in college groups and communities', 'Pooja', '', 34),
  ('5 - Recruitment & Selection', 'Promote on Skyline socials', 'Pooja', '', 35),
  ('5 - Recruitment & Selection', 'Quick-call interview script', '', '', 36),
  ('5 - Recruitment & Selection', 'Accept / reject / waitlist email templates', '', '', 37),
  ('5 - Recruitment & Selection', 'Review applications and shortlist', '', '', 38),
  ('5 - Recruitment & Selection', 'Send offer letters', '', '', 39),
  -- 6 — Onboarding
  ('6 - Onboarding', 'Create ambassador WhatsApp / Discord community', 'Pooja', '', 40),
  ('6 - Onboarding', 'Welcome kit (message + referral code + assets)', 'Ayush', '', 41),
  ('6 - Onboarding', 'Kickoff onboarding call / webinar', '', '', 42),
  ('6 - Onboarding', 'Ship swag / jersey kits', '', '', 43),
  ('6 - Onboarding', 'Share the playbook with ambassadors', '', '', 44),
  -- 7 — Activation & Execution
  ('7 - Activation & Execution', 'Ambassadors run their first campus tournament / scrim', '', '', 45),
  ('7 - Activation & Execution', 'Signup push — align with the public app launch', '', 'Needs the app live on both stores.', 46),
  ('7 - Activation & Execution', 'Weekly content posting', '', '', 47),
  ('7 - Activation & Execution', 'Weekly check-in + reporting template', '', '', 48),
  ('7 - Activation & Execution', 'Collab with gaming clubs and college fests', '', '', 49),
  -- 8 — Rewards & Wrap-up
  ('8 - Rewards & Wrap-up', 'Mid-program rewards / recognition', '', '', 50),
  ('8 - Rewards & Wrap-up', 'Issue certificates', '', '', 51),
  ('8 - Rewards & Wrap-up', 'Top-performer rewards (vouchers / goods — non-gambling)', '', '', 52),
  ('8 - Rewards & Wrap-up', 'Promote top ambassadors to paid / lead roles', '', '', 53),
  ('8 - Rewards & Wrap-up', 'Program retro + learnings', '', '', 54),
  ('8 - Rewards & Wrap-up', 'Plan the next cohort', '', '', 55)
) as v(phase, task, owner, notes, sort_order)
where not exists (select 1 from public.campus_tasks c where c.task = v.task);
