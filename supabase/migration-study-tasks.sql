-- ════════════════════════════════════════════════════════════════
--  D-MATHS — LEARNER STUDY PLANNER (personal to-do)
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
--  A learner's own to-do list on the portal ("My plan"). Their upcoming
--  assignments are shown alongside automatically — those live in the existing
--  assignments tables, so only this personal-tasks table is new.
-- ════════════════════════════════════════════════════════════════

create table if not exists student_tasks (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  done       boolean not null default false,
  due_date   date,
  created_at timestamptz not null default now()
);

create index if not exists student_tasks_student_idx on student_tasks (student_id, done, created_at desc);

alter table student_tasks enable row level security;

-- A learner manages only their own tasks; staff may read them (coaching insight).
drop policy if exists "read own tasks" on student_tasks;
create policy "read own tasks" on student_tasks
  for select using (student_id = auth.uid() or is_staff());

drop policy if exists "insert own tasks" on student_tasks;
create policy "insert own tasks" on student_tasks
  for insert with check (student_id = auth.uid());

drop policy if exists "update own tasks" on student_tasks;
create policy "update own tasks" on student_tasks
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "delete own tasks" on student_tasks;
create policy "delete own tasks" on student_tasks
  for delete using (student_id = auth.uid());
