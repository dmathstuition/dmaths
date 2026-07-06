-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — LEARNING STREAKS
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════════

-- Consecutive-day activity streak, updated once per day when a learner opens
-- their portal (see /api/streak/ping).
alter table profiles
  add column if not exists streak_count    int  not null default 0,
  add column if not exists streak_last_date date;
