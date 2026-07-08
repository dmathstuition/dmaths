-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — MONTHLY SUBSCRIPTIONS (post-camp continuing learners)
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
-- ════════════════════════════════════════════════════════════════════

-- A learner who continues on a monthly plan after the camp. The admin sets the
-- amount + next due date on the student's page; recording a payment for their
-- email rolls the due date forward a month. The reminder cron nudges them
-- (push + bell, learner and linked parents) as the date approaches, and the
-- learner's dashboard shows a due/overdue banner.
alter table profiles
  add column if not exists sub_active      boolean not null default false,
  add column if not exists sub_amount      numeric not null default 0,
  add column if not exists sub_due_date    date,
  add column if not exists sub_reminded_at timestamptz;
