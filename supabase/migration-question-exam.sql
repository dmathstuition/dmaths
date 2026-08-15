-- ════════════════════════════════════════════════════════════════
--  D-MATHS — EXAM TAGGING (question bank + mock requests)
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: so mocks can target a learner's exam goal. Questions can be tagged with
--  the exam they're for (WAEC, GCSE, SAT, …); a mock request captures the
--  learner's exam target; and the mock prefers questions matching that exam,
--  falling back to class-only when nothing is tagged. Columns default harmlessly
--  and every route reads/writes them defensively, so this can be run any time.
-- ════════════════════════════════════════════════════════════════

alter table question_bank  add column if not exists exam text default '';
alter table mock_requests  add column if not exists exam text default '';

create index if not exists question_bank_exam_idx on question_bank (exam);

-- ✅ Check: tagging a question with an exam in the Question bank, then a learner
--    whose target is that exam gets a mock weighted toward those questions.
