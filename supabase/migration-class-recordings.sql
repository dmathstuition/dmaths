-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — CLASS RECORDINGS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
-- ════════════════════════════════════════════════════════════════════

-- A link (Zoom cloud recording, Google Drive, YouTube unlisted…) that admins
-- attach to a class after it happens, so learners can rewatch the lesson.
alter table classes
  add column if not exists recording_url text not null default '';
