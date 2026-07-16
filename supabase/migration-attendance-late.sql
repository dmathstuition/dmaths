-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — LATE ATTENDANCE
--  Marks a learner "late" when they join more than 10 minutes after the
--  class start. They still count as present, just flagged late.
--  Run in Supabase → SQL Editor. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS late boolean NOT NULL DEFAULT false;
