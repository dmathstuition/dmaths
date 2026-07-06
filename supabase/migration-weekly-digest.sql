-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — WEEKLY DIGEST (idempotency stamp)
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════════

-- When the weekly-digest cron last sent this learner their summary, so a
-- re-run within the same week doesn't double-send.
alter table profiles
  add column if not exists last_digest_at timestamptz;
