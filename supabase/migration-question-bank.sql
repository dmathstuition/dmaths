-- ════════════════════════════════════════════════════════════════
--  D-MATHS — CBT QUESTION BANK
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: every CBT test had its questions pasted in as JSON, one test at
--  a time, so nothing carried over between terms. Questions written for
--  last year's Algebra test were gone. Now they're saved once, tagged by
--  subject / level / topic, and a new test is built by picking from the
--  bank (or randomising N from a filter).
--
--  Staff only — no learner ever reads this table, or they'd have the
--  answers. Tests still store their own copy of the questions on
--  `assignments.cbt_questions`, exactly as before, so editing a bank
--  question never changes a test already sat.
-- ════════════════════════════════════════════════════════════════

create table if not exists question_bank (
  id         uuid primary key default gen_random_uuid(),
  subject    text not null default '',
  level      text not null default '',      -- 'JSS 1', 'SS 3'… blank = any
  topic      text not null default '',
  question   text not null,
  code       text not null default '',      -- optional code snippet shown with it
  options    jsonb not null default '[]',   -- ["1","2","3","4"]
  answer     int  not null default 0,       -- 0-based index into options
  owner_id   uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists question_bank_filter_idx on question_bank (subject, level, topic);
create index if not exists question_bank_recent_idx on question_bank (created_at desc);

alter table question_bank enable row level security;

-- Staff read the whole bank so a tutor can build on a colleague's work.
drop policy if exists "staff read question bank" on question_bank;
create policy "staff read question bank" on question_bank
  for select using (is_staff());

-- Writes go through /api/question-bank (service role) after an ownership
-- check, so there is deliberately no insert/update/delete policy here.

-- ✅ Check: Admin → Question bank loads, and saving a question from a CBT
--    makes it appear there.
