-- ════════════════════════════════════════════════════════════════
--  D-MATHS — WEEKLY BOSS BATTLE
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: turn a curated question set (a question_bank group) into a
--  weekly challenge. The admin nominates a group as "the Boss" for the
--  week; each learner gets one attempt, and clearing the pass mark earns
--  a one-off reward. Depends on migration-question-group.sql (group_name).
-- ════════════════════════════════════════════════════════════════

-- The Boss for a given week (keyed by the Monday's date). Upserted on `week`,
-- so re-nominating simply swaps the group.
create table if not exists boss_battles (
  week       text primary key,                 -- YYYY-MM-DD of the week's Monday
  group_name text not null,
  pass_pct   int  not null default 70,
  reward     int  not null default 50,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One row per learner per week — the unique key is the one-attempt guard.
create table if not exists boss_attempts (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  week       text not null,
  score      int  not null default 0,
  total      int  not null default 0,
  passed     boolean not null default false,
  points     int  not null default 0,
  created_at timestamptz not null default now(),
  unique (student_id, week)
);
create index if not exists boss_attempts_week_idx on boss_attempts (week);

alter table boss_battles  enable row level security;
alter table boss_attempts enable row level security;

-- Everyone signed in can see the current Boss (it carries no answers).
drop policy if exists "read boss" on boss_battles;
create policy "read boss" on boss_battles
  for select using (auth.uid() is not null);

-- A learner reads their own attempts; staff read all (for stats).
drop policy if exists "read own boss attempts" on boss_attempts;
create policy "read own boss attempts" on boss_attempts
  for select using (student_id = auth.uid() or is_staff());

-- All writes go through /api/boss (service role) after role + one-attempt checks,
-- so there are deliberately no insert/update policies here.

-- ✅ Check: Admin → Rewards → set this week's Boss from a group; a learner sees
--    it on /portal/boss, gets one attempt, and a pass credits the reward once.
