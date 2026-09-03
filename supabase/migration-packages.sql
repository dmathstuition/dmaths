-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — ENROLMENT PACKAGES
--  Learners now enrol by choosing a package (Tier 1 / 2 / 3) rather than
--  loose subjects. The chosen package is stored on the application and copied
--  to the learner's profile at approval, and shown on their dashboard.
--  Also captures a couple of extra intake details from the 3rd form page.
--  Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ════════════════════════════════════════════════════════════════════

alter table applications
  add column if not exists package_tier text,
  add column if not exists school       text,
  add column if not exists availability text;

alter table profiles
  add column if not exists package_tier text;
