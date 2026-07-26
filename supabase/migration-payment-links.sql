-- ════════════════════════════════════════════════════════════════
--  D-MATHS — LINK PAYMENTS TO A STUDENT
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: the payments ledger was keyed only by the payer's EMAIL, so a
--  manual payment (bank transfer / cash) couldn't be tied to a specific
--  learner. That meant neither the student nor their parent could see a
--  reliable record of what had been paid, or what was still owed.
--
--  This adds an optional student_id to payments. Manual entries now
--  attach it, and the student + parent portals read their own payments
--  by it (falling back to email match for older rows).
-- ════════════════════════════════════════════════════════════════

alter table payments
  add column if not exists student_id uuid references profiles(id) on delete set null;

create index if not exists payments_student_idx on payments (student_id, paid_at desc);

-- Let a learner read their OWN payments, and a linked parent read their
-- child's. Admin already has a read policy from migration-paystack-security.sql;
-- writes still go only through the service role (no insert/update/delete policy).
drop policy if exists "student reads own payments" on payments;
create policy "student reads own payments" on payments
  for select using (
    student_id = auth.uid()
    or exists (
      select 1 from parent_student_links l
      where l.parent_id = auth.uid() and l.student_id = payments.student_id
    )
  );

-- ✅ Check: record a manual payment against a student → it shows on that
--    learner's Payments page and on their parent's.
