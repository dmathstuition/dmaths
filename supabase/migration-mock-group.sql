-- ════════════════════════════════════════════════════════════════
--  D-MATHS — MOCK PAPERS FROM A NAMED SET
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: staff save a batch of questions under a name (a question_bank
--  group, e.g. "S.S 3 Maths — Binary Operations") and want to send that
--  exact paper to the right candidates. This lets a mock request carry the
--  group it should be built from, so every question under that set comes
--  out. Depends on migration-question-group.sql (question_bank.group_name).
-- ════════════════════════════════════════════════════════════════

alter table mock_requests add column if not exists group_name text default '';

-- ✅ Check: Admin → Mock requests → Launch a mock, pick a set (e.g. "S.S 3
--    Maths — Binary Operations"); the chosen learners get a paper made of all
--    that set's questions.
