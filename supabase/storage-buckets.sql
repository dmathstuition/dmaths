-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — CREATE THE STORAGE BUCKETS  (fixes "Bucket not found")
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  All uploads go through the server (service role, which bypasses
--  storage RLS), so no write policies are needed. The buckets are
--  PUBLIC so the saved file URLs (assignment PDFs, submitted photos,
--  materials, voice notes) can be opened by whoever has the link.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('materials',   'materials',   true, 10485760),  -- lesson materials (10 MB)
  ('curricula',   'curricula',   true, 10485760),  -- curriculum documents
  ('assignments', 'assignments', true, 10485760),  -- assignment question sheets
  ('submissions', 'submissions', true, 10485760),  -- students' submitted photos/files
  ('voice-notes', 'voice-notes', true,  5242880)   -- chat voice notes (5 MB)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;
