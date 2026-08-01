-- ════════════════════════════════════════════════════════════════
--  D-MATHS — SELF-PRACTICE QUIZ
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: learners could only sit CBT tests the admin assigned. This lets
--  them practise on their own from the question bank — instant feedback,
--  and correct answers earn a few reward points (capped per day so it
--  can't be farmed). Questions are served and graded server-side by the
--  service role; the answer key never reaches the browser before an
--  answer is submitted, so the staff-only question_bank stays private.
-- ════════════════════════════════════════════════════════════════

create table if not exists practice_sessions (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  subject    text not null default '',
  level      text not null default '',
  total      int  not null default 0,
  correct    int  not null default 0,
  points     int  not null default 0,   -- reward points credited for this round
  day        text not null default '',  -- WAT calendar day (YYYY-MM-DD) for the daily cap
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_student_idx on practice_sessions (student_id, day);

alter table practice_sessions enable row level security;

-- A learner sees only their own practice history; staff can see all.
drop policy if exists "practice read own" on practice_sessions;
create policy "practice read own" on practice_sessions
  for select using (student_id = auth.uid() or is_staff());

-- Writes go through /api/practice (service role) so points are credited
-- and the daily cap enforced server-side — no insert/update policy here.

-- ✅ Check: /portal/practice loads, a round can be sat, and correct
--    answers credit reward points (up to the daily cap).
