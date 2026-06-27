-- ════════════════════════════════════════════════════════════════
--  D-MATHS — PAYSTACK PAYMENT SECURITY
--  Run in: Supabase Dashboard → SQL Editor → New query
--  (Run AFTER migration-summer-camp.sql, which adds payment_verified.)
-- ════════════════════════════════════════════════════════════════

-- ── Authoritative payment ledger ─────────────────────────────────
-- The ONLY trusted record of money received. Written exclusively by the
-- server (service role) from the Paystack webhook and the verify route —
-- never by the browser. The admin approval flow checks this ledger before
-- creating a student account, so a forged client-side "paid" claim is useless.
create table if not exists payments (
  id         uuid primary key default gen_random_uuid(),
  reference  text unique not null,         -- Paystack transaction reference
  email      text default '',
  amount     numeric not null default 0,   -- naira (kobo ÷ 100)
  currency   text not null default 'NGN',
  channel    text default '',
  plan       text default '',              -- camp tier id, from metadata
  camp       text default '',              -- campaign id, from metadata
  status     text not null,                -- 'success', etc.
  paid_at    timestamptz,
  raw        jsonb default '{}',           -- full Paystack payload for audit
  created_at timestamptz not null default now()
);

alter table payments enable row level security;
-- Admins may read the ledger. There is deliberately NO insert/update/delete
-- policy: only the service role (which bypasses RLS) can write to it.
drop policy if exists "admin read payments" on payments;
create policy "admin read payments" on payments for select using (is_admin());

create index if not exists payments_email_idx on payments (lower(email));

-- ── Applications can never be born "verified" ────────────────────
-- The public enrolment form inserts with the anon key, so a malicious caller
-- could try to insert payment_verified = true. This trigger forces every
-- INSERT to land unverified; the flag can only be set true later by a
-- server-side UPDATE (Paystack verify route / webhook / approval gate),
-- none of which are reachable from the browser with forged data.
create or replace function force_unverified_on_insert() returns trigger
language plpgsql as $$
begin
  new.payment_verified := false;
  new.payment_verified_at := null;
  return new;
end; $$;

drop trigger if exists trg_force_unverified on applications;
create trigger trg_force_unverified
  before insert on applications
  for each row execute function force_unverified_on_insert();
