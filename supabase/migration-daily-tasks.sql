-- ════════════════════════════════════════════════════════════════
--  D-MATHS — TASK OF THE DAY
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════
create table if not exists daily_tasks (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  title       text not null,
  details     text default '',
  batch_id    uuid,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  done        boolean not null default false,
  done_at     timestamptz,
  response    text default ''
);
create index if not exists daily_tasks_student_idx on daily_tasks (student_id, done, created_at desc);
create index if not exists daily_tasks_batch_idx on daily_tasks (batch_id);
alter table daily_tasks enable row level security;
drop policy if exists "read own daily tasks" on daily_tasks;
create policy "read own daily tasks" on daily_tasks
  for select using (student_id = auth.uid() or is_staff());
drop policy if exists "staff write daily tasks" on daily_tasks;
create policy "staff write daily tasks" on daily_tasks
  for all using (is_staff()) with check (is_staff());
