-- ════════════════════════════════════════════════════════════════
--  D-MATHS — MOCK EXAM MODE
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: practice is short and low-stakes. Mock Exam mode gives learners a
--  timed, exam-style paper (Quick / WAEC / JAMB flavours) pulled from the
--  question bank and auto-marked into a WAEC-style grade band with a
--  per-topic breakdown, so they can gauge exam readiness. Finishing the
--  first mock of the day earns a small flat bonus (capped once/day so it
--  can't be farmed). Papers are served and graded server-side by the
--  service role; the answer key never reaches the browser before submit.
-- ════════════════════════════════════════════════════════════════

create table if not exists mock_exam_sessions (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  preset     text not null default '',   -- 'quick' | 'waec' | 'jamb'
  subject    text not null default '',
  level      text not null default '',
  total      int  not null default 0,
  correct    int  not null default 0,
  percent    int  not null default 0,    -- 0..100
  band       text not null default '',   -- WAEC grade, e.g. 'B2'
  points     int  not null default 0,    -- completion bonus credited (0 after the first of the day)
  day        text not null default '',   -- WAT calendar day (YYYY-MM-DD) for the once-a-day bonus
  created_at timestamptz not null default now()
);

create index if not exists mock_exam_sessions_student_idx on mock_exam_sessions (student_id, created_at desc);
create index if not exists mock_exam_sessions_day_idx on mock_exam_sessions (student_id, day);

alter table mock_exam_sessions enable row level security;

-- A learner sees only their own mock history; staff can see all.
drop policy if exists "mock read own" on mock_exam_sessions;
create policy "mock read own" on mock_exam_sessions
  for select using (student_id = auth.uid() or is_staff());

-- Writes go through /api/mock-exam (service role) so grading + the daily
-- bonus cap are enforced server-side — no insert/update policy here.

-- ✅ Check: /portal/mock-exam loads, a timed paper can be sat and submitted,
--    and the result shows a grade band + a per-topic breakdown.
