-- ════════════════════════════════════════════════════════════════
--  D-MATHS — QUESTION GROUPS / SETS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: staff wanted to bundle questions into named sets (e.g. "SS3
--  Algebra Mock Set") rather than only tagging them by subject/level/
--  topic — so a group of 20+ can be curated once and pulled together
--  when building a mock or CBT. One nullable text column, defaulting
--  harmlessly; every route reads/writes it defensively, so this can be
--  run at any time without breaking the bank beforehand.
-- ════════════════════════════════════════════════════════════════

alter table question_bank add column if not exists group_name text default '';

create index if not exists question_bank_group_idx on question_bank (group_name);

-- ✅ Check: in Admin → Question bank, typing a group name when saving a
--    question makes that group appear in the Groups overview with its count,
--    turning "mock-ready" once it reaches 20 questions.
