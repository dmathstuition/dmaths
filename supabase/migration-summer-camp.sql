-- ════════════════════════════════════════════════════════════════
--  D-MATHS — SUMMER CAMP MIGRATION
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════

-- Tag applications with the campaign + chosen package, and add the
-- payment-verification columns the app already writes (pre-existing bug:
-- the apply form and /api/paystack/verify reference these but they were
-- never added to the schema).
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS camp                text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS plan                text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_verified    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

-- camp = campaign id (e.g. 'summer-2026'); empty for normal enrolments
-- plan = camp package id (e.g. 'pers-coding'); empty for normal enrolments
