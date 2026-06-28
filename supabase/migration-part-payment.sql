-- ════════════════════════════════════════════════════════════════
--  D-MATHS — PART (HALF) PAYMENT
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════

-- Tracks whether a camp enrolment was paid in full or with a 50% deposit
-- (balance owed). The full price is derivable from `plan`, so the balance is
-- computed in the app — only the plan flag is stored here.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS pay_plan text NOT NULL DEFAULT 'full'; -- 'full' | 'part'
