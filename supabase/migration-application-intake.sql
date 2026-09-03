-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — APPLICATION INTAKE PROFILE
--  The registration form now captures a short intake profile (strengths,
--  challenges, weak points) and specialised-exam details, used to plan
--  teaching and to level the learner's aptitude test. Payment is no longer
--  collected at sign-up (tuition is billed monthly from attendance).
--  Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ════════════════════════════════════════════════════════════════════

alter table applications
  add column if not exists strengths    text,
  add column if not exists challenges   text,
  add column if not exists weak_points  text,
  add column if not exists exam_date    date,
  add column if not exists target_grade text;
