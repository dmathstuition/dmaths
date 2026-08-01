-- ════════════════════════════════════════════════════════════════
--  D-MATHS — DAILY REWARD CHEST
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
--  Learners open one reward chest per day for bonus reward points — a nudge to
--  visit daily. Points land in profiles.reward_points (leaderboard + shop).
-- ════════════════════════════════════════════════════════════════

create table if not exists daily_rewards (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  day        date not null,
  points     int  not null check (points > 0),
  created_at timestamptz not null default now(),
  unique (student_id, day)   -- one chest per learner per day (also stops races)
);
create index if not exists daily_rewards_student_idx on daily_rewards (student_id, day desc);

alter table daily_rewards enable row level security;

-- A learner reads their own claims; staff read all. The claim itself is written
-- by the service-role API (which also credits the points), so no insert policy.
drop policy if exists "read own daily" on daily_rewards;
create policy "read own daily" on daily_rewards
  for select using (student_id = auth.uid() or is_staff());
