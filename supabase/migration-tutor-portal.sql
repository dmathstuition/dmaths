-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — TUTOR PORTAL (Phase 1)
--  Adds a scoped "tutor" role: tutors see only their assigned classes and
--  learners (read-only in Phase 1). The admin stays a full superset — every
--  existing is_admin() policy is untouched; these only ADD tutor access.
--
--  Run in: Supabase Dashboard → SQL Editor → New query. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- 1. New role ─────────────────────────────────────────────────────────
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tutor';

-- 2. Assign a tutor to a class (optional; NULL = admin's own class) ────
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS tutor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS classes_tutor_id ON classes (tutor_id);

-- 3. Direct learner ↔ tutor assignment (the "individual" roster) ───────
CREATE TABLE IF NOT EXISTS teacher_students (
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, student_id)
);
ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;

-- 4. Helper functions (security definer → no RLS recursion) ────────────

-- Admin OR tutor.
CREATE OR REPLACE FUNCTION is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','tutor')
  );
$$;

-- True if the current tutor teaches `student` — either the learner is on the
-- roster of a class assigned to them, or they're directly assigned.
CREATE OR REPLACE FUNCTION tutor_teaches(student uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_students ts
    WHERE ts.teacher_id = auth.uid() AND ts.student_id = student
  ) OR EXISTS (
    SELECT 1 FROM classes c
    JOIN class_students cs ON cs.class_id = c.id
    WHERE c.tutor_id = auth.uid() AND cs.student_id = student
  );
$$;

-- 5. teacher_students policies ────────────────────────────────────────
DROP POLICY IF EXISTS "tutor own assignments" ON teacher_students;
CREATE POLICY "tutor own assignments" ON teacher_students
  FOR SELECT USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "admin manage teacher_students" ON teacher_students;
CREATE POLICY "admin manage teacher_students" ON teacher_students
  USING (is_admin());

-- 6. Tutor-scoped READ policies (additive; Phase 1 is read-only) ───────

-- Read learner profiles in their roster.
DROP POLICY IF EXISTS "tutor read own learners" ON profiles;
CREATE POLICY "tutor read own learners" ON profiles
  FOR SELECT USING (tutor_teaches(id));

-- Read their assigned classes.
DROP POLICY IF EXISTS "tutor read own classes" ON classes;
CREATE POLICY "tutor read own classes" ON classes
  FOR SELECT USING (tutor_id = auth.uid());

-- Read the rosters of their assigned classes.
DROP POLICY IF EXISTS "tutor read own class rosters" ON class_students;
CREATE POLICY "tutor read own class rosters" ON class_students
  FOR SELECT USING (tutor_teaches(student_id));

-- Read rewards / attendance / submissions for roster learners (reports).
DROP POLICY IF EXISTS "tutor read learner rewards" ON rewards;
CREATE POLICY "tutor read learner rewards" ON rewards
  FOR SELECT USING (tutor_teaches(student_id));

DROP POLICY IF EXISTS "tutor read learner attendance" ON attendance_records;
CREATE POLICY "tutor read learner attendance" ON attendance_records
  FOR SELECT USING (tutor_teaches(student_id));

DROP POLICY IF EXISTS "tutor read learner submissions" ON assignment_submissions;
CREATE POLICY "tutor read learner submissions" ON assignment_submissions
  FOR SELECT USING (tutor_teaches(student_id));

-- Staff (admin already covered) read all assignment definitions for reports.
DROP POLICY IF EXISTS "tutor read assignments" ON assignments;
CREATE POLICY "tutor read assignments" ON assignments
  FOR SELECT USING (is_staff());

-- Behaviour logs for roster learners (table added by migration-behaviors.sql;
-- guarded so this migration is safe to run even if that table is absent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'behavior_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "tutor read learner behaviour" ON behavior_logs';
    EXECUTE 'CREATE POLICY "tutor read learner behaviour" ON behavior_logs
             FOR SELECT USING (tutor_teaches(student_id))';
  END IF;
END $$;
