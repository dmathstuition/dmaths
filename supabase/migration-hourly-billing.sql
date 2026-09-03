-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — ATTENDANCE-BASED HOURLY BILLING
--  Tuition is charged per hour. Each class carries a rate tier; a learner's
--  monthly bill is the sum of (attended hours × that class's hourly rate),
--  computed automatically and raised 3 days before the month ends.
--  Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ════════════════════════════════════════════════════════════════════

-- Which hourly rate a class bills at:
--   standard = Maths / English / Science   (₦18,000/hr)
--   ks2      = KS2 exam prep               (₦20,000/hr)
--   coding   = any class including coding  (₦25,000/hr)
alter table classes
  add column if not exists rate_tier text not null default 'standard';

-- Remembers the last month a learner's attendance bill was raised
-- ("YYYY-MM"), so the daily billing cron never double-bills a month.
alter table profiles
  add column if not exists sub_billed_month text;
