-- ════════════════════════════════════════════════════════════════
--  D-MATHS — PAYMENT RECEIPTS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: parents had no proof of payment. The `payments` ledger is keyed
--  by the payer's EMAIL, not by student, so a receipt is the row that
--  ties a payment to a family and gives it a number they can quote.
--
--  One receipt per payment reference. Issuing is admin-only and goes
--  through /api/receipts (service role); this table only ever grants
--  READ, to the people the receipt belongs to.
-- ════════════════════════════════════════════════════════════════

create table if not exists receipts (
  id                uuid primary key default gen_random_uuid(),
  payment_reference text not null unique references payments(reference) on delete cascade,
  serial            text not null unique,          -- RCT-2026-A1B2C3
  student_id        uuid references profiles(id) on delete set null,
  payer_email       text not null default '',
  amount            numeric not null default 0,
  paid_at           timestamptz,
  note              text not null default '',      -- "First term fees", etc.
  issued_by         uuid references profiles(id) on delete set null,
  issued_at         timestamptz not null default now()
);

create index if not exists receipts_student_idx on receipts (student_id, issued_at desc);
create index if not exists receipts_email_idx   on receipts (payer_email);

alter table receipts enable row level security;

-- The learner it belongs to, a linked parent, the payer by email, and staff.
drop policy if exists "read own receipts" on receipts;
create policy "read own receipts" on receipts
  for select using (
    is_staff()
    or student_id = auth.uid()
    or exists (
      select 1 from parent_student_links l
      where l.parent_id = auth.uid() and l.student_id = receipts.student_id
    )
    or lower(payer_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

-- No insert/update/delete policy: only /api/receipts (service role) writes.

-- ✅ Check: Admin → Payments shows a "Receipt" action on each row, and the
--    parent portal lists the receipts for their child.
