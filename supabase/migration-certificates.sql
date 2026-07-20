-- ════════════════════════════════════════════════════════════════
--  D-MATHS — CERTIFICATES
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Admins issue branded certificates (e.g. Summer Camp completion);
--  the learner downloads a printable copy from their portal.
-- ════════════════════════════════════════════════════════════════

create table if not exists certificates (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  title       text not null,                       -- e.g. "Certificate of Completion"
  subtitle    text default '',                     -- e.g. "Summer Coding Camp 2026"
  note        text default '',                     -- optional line of detail / achievement
  serial      text not null,                       -- human-readable verification code
  issued_by   uuid references profiles(id) on delete set null,
  issued_at   timestamptz not null default now()
);

create index if not exists certificates_student_idx on certificates (student_id, issued_at desc);

alter table certificates enable row level security;

-- A learner reads only their own certificates; admins read all.
drop policy if exists "read own certificates" on certificates;
create policy "read own certificates" on certificates
  for select using (student_id = auth.uid() or is_admin());

-- Only admins may issue / revoke. (The API uses the service role, which
-- bypasses RLS, but these policies keep the table safe under the anon key.)
drop policy if exists "admin write certificates" on certificates;
create policy "admin write certificates" on certificates
  for all using (is_admin()) with check (is_admin());
