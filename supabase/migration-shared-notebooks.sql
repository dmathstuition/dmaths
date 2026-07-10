-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — SHAREABLE NOTEBOOKS
--  Lets a tutor/admin mark a saved notebook as "shared" so their learners
--  can open a copy as a starter (like handing out a Colab template).
--  Run in Supabase → SQL Editor. Safe to re-run.
--  Requires migration-code-snippets.sql first.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE code_snippets ADD COLUMN IF NOT EXISTS shared         boolean NOT NULL DEFAULT false;
ALTER TABLE code_snippets ADD COLUMN IF NOT EXISTS shared_by_name text;

-- Speeds up the "shared notebooks" list.
CREATE INDEX IF NOT EXISTS code_snippets_shared ON code_snippets (shared, updated_at DESC) WHERE shared = true;

-- Any signed-in user may READ a shared notebook (in addition to their own /
-- admin read policy). They still can't edit it — the owner "write" policy is
-- unchanged, so opening a shared notebook only ever creates the learner's own copy.
DROP POLICY IF EXISTS "read shared notebooks" ON code_snippets;
CREATE POLICY "read shared notebooks" ON code_snippets
  FOR SELECT USING (shared = true);
