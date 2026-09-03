-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — APTITUDE TEST TIME AT REGISTRATION
--  The preferred date/time for the learner's aptitude test is now chosen on
--  the registration form. It's stored on the application and becomes the
--  test's scheduled time at approval — the admin just follows it.
--  Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ════════════════════════════════════════════════════════════════════

alter table applications
  add column if not exists aptitude_at timestamptz;
