-- ════════════════════════════════════════════════════════════════
--  D-MATHS — DAILY QUESTS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: three tiny self-serve goals a day (a practice round, review some
--  cards, open the reward chest) with a bonus for clearing all three — a
--  daily habit loop. The quest PROGRESS is computed live from existing
--  tables (practice_sessions, flashcard_reviews, daily_rewards); this table
--  only records the one-per-day all-clear BONUS claim so it can't be double
--  credited. The +points are added by /api/quests (service role).
-- ════════════════════════════════════════════════════════════════

create table if not exists daily_quest_claims (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  day        date not null,
  points     int  not null default 0,
  created_at timestamptz not null default now(),
  unique (student_id, day)   -- one all-clear bonus per learner per day (also stops races)
);
create index if not exists daily_quest_claims_student_idx on daily_quest_claims (student_id, day desc);

alter table daily_quest_claims enable row level security;

-- A learner reads their own claims; staff can see all. The bonus is credited
-- through the service-role API, so there is no learner insert policy.
drop policy if exists "read own quest claims" on daily_quest_claims;
create policy "read own quest claims" on daily_quest_claims
  for select using (student_id = auth.uid() or is_staff());

-- ✅ Check: /portal shows the Daily Quests card; completing all three surfaces
--    a "Claim" button that credits the bonus once.
