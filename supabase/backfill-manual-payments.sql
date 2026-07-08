-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — BACKFILL MANUAL PAYMENTS INTO THE LEDGER (one-off)
--  Run in: Supabase Dashboard → SQL Editor → New query
--
--  Approvals now mirror manual (transfer/Opay/cash) money into the
--  `payments` ledger automatically. This backfills learners who were
--  approved BEFORE that change, so the Payments dashboard and revenue
--  analytics include them. Idempotent — safe to run again.
-- ════════════════════════════════════════════════════════════════════

insert into payments (reference, email, amount, currency, channel, plan, camp, status, paid_at, raw)
select
  'MANUAL-' || a.id,
  a.email,
  a.payment_amount,
  'NGN',
  'Manual · ' || coalesce(nullif(a.payment_method, ''), 'transfer'),
  coalesce(a.plan, ''),
  coalesce(a.camp, ''),
  'success',
  coalesce(a.payment_date::timestamptz, a.reviewed_at, a.created_at),
  jsonb_build_object('source', 'backfill', 'application_id', a.id, 'typed_reference', a.payment_ref)
from applications a
where a.status = 'approved'
  and coalesce(a.payment_amount, 0) > 0
  and coalesce(a.payment_method, '') !~* 'paystack'
  and coalesce(a.payment_method, '') !~* 'free'
on conflict (reference) do nothing;
