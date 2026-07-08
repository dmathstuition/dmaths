-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — VOICE NOTES IN CHAT
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again. (Also run storage-buckets.sql, which
--  creates the 'voice-notes' bucket the recordings are stored in.)
-- ════════════════════════════════════════════════════════════════════

alter table messages
  add column if not exists audio_url text;
