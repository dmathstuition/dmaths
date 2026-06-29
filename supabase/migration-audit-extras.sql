-- ════════════════════════════════════════════════════════════════
--  D-MATHS — AUDIT EXTRAS
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════

-- Track the last time each account signed in (accountability / "last seen").
-- Set server-side by /api/auth/touch after a successful login.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
