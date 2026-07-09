-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — LEARNER ↔ TUTOR DIRECT MESSAGES
--  Adds a private thread between a learner and each of their tutors, kept
--  separate from the learner↔admin thread. Run in Supabase → SQL Editor.
--  Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- A message's thread is (student_id, tutor_id):
--   tutor_id IS NULL  → learner ↔ admin  (existing behaviour, unchanged)
--   tutor_id = <tutor> → learner ↔ that tutor
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS tutor_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS messages_student_tutor
  ON messages (student_id, tutor_id, created_at);

-- A tutor may read / write / mark-read messages in threads they own. The
-- existing learner policies (student_id = auth.uid()) already cover the
-- learner's side of these threads; admin policies already cover everything.
DROP POLICY IF EXISTS "tutor read tutor thread" ON messages;
CREATE POLICY "tutor read tutor thread" ON messages
  FOR SELECT USING (tutor_id = auth.uid());

DROP POLICY IF EXISTS "tutor write tutor thread" ON messages;
CREATE POLICY "tutor write tutor thread" ON messages
  FOR INSERT WITH CHECK (tutor_id = auth.uid() AND sender_id = auth.uid() AND sender_role = 'tutor');

DROP POLICY IF EXISTS "tutor update tutor thread" ON messages;
CREATE POLICY "tutor update tutor thread" ON messages
  FOR UPDATE USING (tutor_id = auth.uid());
