-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — REUSE A DELETED LEARNER'S STUDENT ID
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
--
--  After a learner is permanently deleted (Danger zone → Delete, or
--  supabase/delete-learner.sql), their Student ID — e.g. DM-2026-0001 —
--  should be free for the next incoming learner to use.
--
--  This replaces next_student_code() so it hands out the LOWEST free number
--  for the current year (filling the gap a deletion leaves) before allocating
--  a brand-new one. Both enrolment paths (application approval and CSV import)
--  call this function, so reuse happens automatically.
--
--  Why this is safe: deletion is a COMPLETE hard-delete and every record is
--  keyed on the learner's immutable UUID, never on the code string. A recycled
--  code therefore carries none of the deleted learner's data, and the unique
--  constraint on profiles.student_code guarantees two active learners can never
--  hold the same ID. (Note: documents already issued to the old learner —
--  receipts, certificates, report cards — still show that code beside the old
--  name, so the ID is no longer a lifetime-unique identifier of a person.)
-- ════════════════════════════════════════════════════════════════════

create or replace function next_student_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  yr        text := to_char(now(), 'YYYY');
  max_used  int;
  next_num  int;
begin
  -- Highest number currently in use for this year's prefix (0 if none).
  select coalesce(max((split_part(student_code, '-', 3))::int), 0)
    into max_used
    from profiles
   where student_code ~ ('^DM-' || yr || '-[0-9]+$');

  -- Lowest number in [1 .. max_used + 1] that no profile currently holds.
  -- A gap = the ID of a deleted learner, reused first; max_used + 1 guarantees
  -- a free slot when there are no gaps (i.e. normal sequential growth).
  select g
    into next_num
    from generate_series(1, max_used + 1) as g
   where not exists (
     select 1 from profiles
      where student_code = 'DM-' || yr || '-' || lpad(g::text, 4, '0')
   )
   order by g
   limit 1;

  return 'DM-' || yr || '-' || lpad(next_num::text, 4, '0');
end $$;

-- Quick check (optional): the next ID that would be issued right now.
-- select next_student_code();
