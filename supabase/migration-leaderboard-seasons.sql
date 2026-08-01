-- ════════════════════════════════════════════════════════════════
--  D-MATHS — LEADERBOARD SEASONS + HALL OF FAME
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: the leaderboard ranks by lifetime reward_points, so early leaders
--  run away with it forever. This adds a monthly season (points earned
--  *this month*) plus a Hall of Fame of past champions — without ever
--  resetting reward_points (it's also the shop currency).
--
--  How: at the start of each season we snapshot every learner's total
--  into `season_baselines`. Season score = total − baseline. The gap
--  between two consecutive months' baselines is what a learner earned in
--  the earlier month, which is how `season_champions` is filled. The app
--  writes both tables with the service role, so there are no learner
--  write policies here.
-- ════════════════════════════════════════════════════════════════

create table if not exists season_baselines (
  student_id uuid not null references profiles(id) on delete cascade,
  season     text not null,                 -- 'YYYY-MM' (WAT)
  baseline   int  not null default 0,        -- reward_points total at season start
  created_at timestamptz not null default now(),
  primary key (student_id, season)
);
create index if not exists season_baselines_season_idx on season_baselines (season);

create table if not exists season_champions (
  season     text not null,                 -- the completed season
  rank       int  not null,                 -- 1..N
  student_id uuid references profiles(id) on delete set null,
  name       text not null default '',       -- captured at the time (learner may leave)
  points     int  not null default 0,        -- points earned that season
  created_at timestamptz not null default now(),
  primary key (season, rank)
);

alter table season_baselines enable row level security;
alter table season_champions enable row level security;

-- Read policies are for staff; the leaderboard page reads with the service
-- role, so learners never query these directly. Writes are service-role only.
drop policy if exists "staff read baselines" on season_baselines;
create policy "staff read baselines" on season_baselines for select using (is_staff());

drop policy if exists "staff read champions" on season_champions;
create policy "staff read champions" on season_champions for select using (is_staff());

-- ✅ Check: open /portal/leaderboard, toggle "This month" — it ranks by
--    points earned this month, and once a month rolls over the previous
--    month's top 3 appear under "Hall of Fame".
