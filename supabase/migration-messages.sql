-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — DIRECT MESSAGES (admin ↔ learner, two-way)
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════════

-- One row per message. A "thread" is all rows sharing the same student_id
-- (the learner). Messages can be written by an admin or by the learner.
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,  -- thread owner (the learner)
  sender_id   uuid not null references profiles(id) on delete cascade,  -- who wrote it
  sender_role text not null,                                            -- 'admin' | 'student'
  body        text not null,
  read        boolean not null default false,                          -- read by the OTHER party
  created_at  timestamptz not null default now()
);

alter table messages enable row level security;

-- A learner sees only their own thread; admins see all threads.
drop policy if exists "read own thread" on messages;
create policy "read own thread" on messages
  for select using (student_id = auth.uid() or is_admin());

-- Admins may write any message; a learner may only write into their OWN
-- thread, as themselves, tagged 'student'. (Inserts run via the service role
-- in the API too, which bypasses RLS — this is defence in depth.)
drop policy if exists "send message" on messages;
create policy "send message" on messages
  for insert with check (
    is_admin()
    or (student_id = auth.uid() and sender_id = auth.uid() and sender_role = 'student')
  );

-- Either participant may mark messages read.
drop policy if exists "update read" on messages;
create policy "update read" on messages
  for update using (student_id = auth.uid() or is_admin());

create index if not exists messages_student_created on messages (student_id, created_at);
