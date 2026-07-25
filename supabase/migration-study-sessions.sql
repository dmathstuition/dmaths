-- ════════════════════════════════════════════════════════════════
--  D-MATHS — FOCUS MODE (STUDY SESSIONS)
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Records each focused study session a learner completes with the
--  in-portal timer, so they (and staff) can see real study effort.
-- ════════════════════════════════════════════════════════════════

create table if not exists study_sessions (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  minutes    int  not null check (minutes > 0 and minutes <= 240),
  subject    text default '',
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_student_idx on study_sessions (student_id, created_at desc);

alter table study_sessions enable row level security;

-- A learner reads their own sessions; staff read all (for coaching/insight).
drop policy if exists "read own study sessions" on study_sessions;
create policy "read own study sessions" on study_sessions
  for select using (student_id = auth.uid() or is_staff());

-- Sessions are written by the learner (through the API, which stamps the
-- authenticated user id) — a learner may only insert their own rows.
drop policy if exists "insert own study sessions" on study_sessions;
create policy "insert own study sessions" on study_sessions
  for insert with check (student_id = auth.uid());
