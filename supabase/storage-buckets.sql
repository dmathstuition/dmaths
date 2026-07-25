-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — CREATE THE STORAGE BUCKETS  (fixes "Bucket not found")
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  All uploads go through the server (service role, which bypasses
--  storage RLS), so no write policies are needed.
--
--  TWO KINDS OF BUCKET:
--
--   • PUBLIC  — teaching content that is handed out to learners anyway
--     (lesson materials, curriculum documents, assignment question
--     sheets). Anyone with the link can open it.
--
--   • PRIVATE — a child's own submitted work, and private chat audio.
--     These are nobody else's business, so they are NOT public. The app
--     reads them through /api/files/download, which checks who is asking
--     and then mints a signed URL that expires in 5 minutes. A leaked
--     link (forwarded email, shared computer, browser history) therefore
--     stops working instead of granting access forever.
--
--  Re-running this on an existing project FLIPS submissions + voice-notes
--  to private. That is the point: previously-copied public links stop
--  working, and the app keeps working because it signs every read.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('materials',   'materials',   true,  10485760),  -- lesson materials (10 MB)
  ('curricula',   'curricula',   true,  10485760),  -- curriculum documents
  ('assignments', 'assignments', true,  10485760),  -- assignment question sheets
  ('submissions', 'submissions', false, 10485760),  -- PRIVATE: students' submitted photos/files
  ('voice-notes', 'voice-notes', false,  5242880)   -- PRIVATE: chat voice notes (5 MB)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- ✅ Check: Supabase → Storage. `submissions` and `voice-notes` show a
--    "Private" badge; the other three show "Public".
