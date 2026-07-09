-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — CODING ASSIGNMENTS
--  Tutors/admin set a Python or Web (HTML/CSS/JS) question; learners code
--  the answer in the in-browser IDE and submit it. Run in Supabase → SQL
--  Editor. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- New assignment kind.
ALTER TYPE assignment_type ADD VALUE IF NOT EXISTS 'code';

-- Which IDE + optional starter code the learner opens with.
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS code_language text;          -- 'python' | 'web'
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS starter_code  text DEFAULT '';

-- The learner's submitted code (Python source, or a {html,css,js} JSON for web).
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS code text;
