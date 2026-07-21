-- ════════════════════════════════════════════════════════════════
--  D-MATHS — LESSON LOG / CLASS NOTES
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Staff record what was covered each session (topic, notes, homework),
--  building a teaching history admins and tutors can review.
-- ════════════════════════════════════════════════════════════════

create table if not exists lesson_notes (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid references classes(id) on delete cascade,
  subject    text default '',                 -- denormalised from the class for easy listing
  topic      text not null,
  notes      text default '',
  homework   text default '',
  taught_on  date not null default current_date,
  author_id  uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lesson_notes_class_idx on lesson_notes (class_id, taught_on desc);

alter table lesson_notes enable row level security;

-- Staff (admin + tutor) read and write. The API additionally restricts tutors
-- to their own classes; the service role bypasses RLS for those writes.
drop policy if exists "staff read lesson notes" on lesson_notes;
create policy "staff read lesson notes" on lesson_notes
  for select using (is_staff());

drop policy if exists "staff write lesson notes" on lesson_notes;
create policy "staff write lesson notes" on lesson_notes
  for all using (is_staff()) with check (is_staff());
