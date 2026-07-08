-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — ASSIGNMENT DEADLINE TIME
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
-- ════════════════════════════════════════════════════════════════════

-- Assignments previously had a date-only deadline (due_date). due_at adds the
-- exact deadline moment (stored UTC, entered/displayed as WAT). due_date is
-- kept in sync for backwards compatibility (reminders, filters).
alter table assignments
  add column if not exists due_at timestamptz;

-- Backfill: existing date-only deadlines become 23:59 WAT on that day.
update assignments
  set due_at = (due_date::timestamp + interval '23 hours 59 minutes') at time zone 'Africa/Lagos'
  where due_at is null and due_date is not null;
