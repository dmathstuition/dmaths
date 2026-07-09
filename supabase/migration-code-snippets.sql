-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — PYTHON PLAYGROUND SNIPPETS
--  Learners save & reopen their own Python code. Run in Supabase → SQL Editor.
--  Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS code_snippets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT 'Untitled',
  language   text NOT NULL DEFAULT 'python',
  code       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS code_snippets_user ON code_snippets (user_id, updated_at DESC);

ALTER TABLE code_snippets ENABLE ROW LEVEL SECURITY;

-- Owners manage only their own snippets; admins can read for support.
DROP POLICY IF EXISTS "own snippets read" ON code_snippets;
CREATE POLICY "own snippets read" ON code_snippets
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "own snippets write" ON code_snippets;
CREATE POLICY "own snippets write" ON code_snippets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
