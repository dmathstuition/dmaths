-- ════════════════════════════════════════════════════════════════
--  D-MATHS — INTERNATIONAL REGISTRATION (Nigeria · UK · US)
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: the academy serves learners in Nigeria, the UK and the US. Each region
--  has its own class/year names and exams (incl. UK external & professional
--  exams). Registration now captures the learner's region and the exam they're
--  preparing for; these carry from the application onto the profile at approval.
--  Both columns default harmlessly, and the submit/approve routes tolerate them
--  being absent — so this can be run any time.
-- ════════════════════════════════════════════════════════════════

alter table applications add column if not exists country     text default 'NG';
alter table applications add column if not exists exam_target  text default '';

alter table profiles     add column if not exists country     text default 'NG';
alter table profiles     add column if not exists exam_target  text default '';

-- ✅ Check: the /apply form shows a "Where do you study?" selector whose class
--    list changes per region, plus an "exam target"; both appear on the created
--    profile after approval.
