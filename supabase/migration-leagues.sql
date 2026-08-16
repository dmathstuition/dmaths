-- ════════════════════════════════════════════════════════════════
--  D-MATHS — LEAGUES: WEEKLY TOURNAMENT BASELINES
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: the Leagues page ranks learners by points earned THIS WEEK
--  (a fresh tournament that resets every week) without ever touching
--  reward_points. At the first view of a new week we snapshot every
--  active learner's total here; week score = current total − baseline.
--  Divisions (Bronze → Diamond) are derived from lifetime points in code
--  and need no table. Mirrors the monthly season_baselines pattern.
-- ════════════════════════════════════════════════════════════════

create table if not exists league_baselines (
  student_id uuid not null references profiles(id) on delete cascade,
  week       text not null,                  -- 'YYYY-MM-DD' of the week's Monday (WAT)
  baseline   int  not null default 0,         -- reward_points total at week start
  created_at timestamptz not null default now(),
  primary key (student_id, week)
);
create index if not exists league_baselines_week_idx on league_baselines (week);

alter table league_baselines enable row level security;

-- The Leagues page reads with the service role, so learners never query this
-- directly; a staff read policy is provided for admin tooling. Writes are
-- service-role only (no learner write policy).
drop policy if exists "staff read league baselines" on league_baselines;
create policy "staff read league baselines" on league_baselines for select using (is_staff());

-- ✅ Check: open /portal/leagues — you sit in a Division by lifetime points, and
--    "This week" ranks by points earned since Monday, resetting each week.
