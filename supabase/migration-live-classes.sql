-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — LIVE CLASS "LIVE NOW" STATE
--  When a tutor opens the in-portal live room, the class is flagged live so
--  learners see a "🔴 LIVE now" badge. A heartbeat keeps it fresh; the app
--  treats the class as live only while the timestamp is recent.
--  Run in Supabase → SQL Editor. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE classes ADD COLUMN IF NOT EXISTS live_since timestamptz;
