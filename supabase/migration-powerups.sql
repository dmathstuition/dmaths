-- ════════════════════════════════════════════════════════════════
--  D-MATHS — POWER-UPS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: consumable perks to spend reward points on.
--    • Streak Freeze  — streak_freezes: a stock that auto-protects the streak
--                       when a single day is missed (consumed by /api/streak/ping).
--    • 2× Points Boost — boost_until: while in the future, earn routes double the
--                       reward points from practice, mocks & flashcards.
--
--  Buying goes through /api/powerups (service role): it spends via the shop
--  ledger (reward_redemptions, so the leaderboard total is untouched) and bumps
--  the field below. Both default harmlessly, so the feature is off until run.
-- ════════════════════════════════════════════════════════════════

alter table profiles add column if not exists streak_freezes int not null default 0;
alter table profiles add column if not exists boost_until    timestamptz;

-- ✅ Check: the Power-ups card on /portal/shop can buy a freeze (count goes up)
--    and a boost (a countdown appears); missing a day with a freeze in stock
--    keeps the streak.
