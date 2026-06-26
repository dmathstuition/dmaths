-- Extend user_role enum to include parent accounts
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';

-- Link table: parent can be linked to multiple students (siblings)
CREATE TABLE IF NOT EXISTS parent_student_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent own links" ON parent_student_links;
CREATE POLICY "parent own links" ON parent_student_links
  FOR SELECT USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "admin all parent links" ON parent_student_links;
CREATE POLICY "admin all parent links" ON parent_student_links
  USING (is_admin());

-- Add guardian_email to applications so it's collected at enrollment time
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS guardian_email text NOT NULL DEFAULT '';
