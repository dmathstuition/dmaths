-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — REFERRALS + IN-APP RATINGS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again. Wrapped in a transaction so a dropped
--  connection can never leave it half-applied (all-or-nothing).
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── 1) REFERRALS ────────────────────────────────────────────────────
-- A student's referral "code" is simply their existing student_code
-- (e.g. DM-2026-0001); the share link is /apply?ref=<student_code>.
-- We record the raw code on the application, and on approval resolve it
-- to the referring student, link the new learner, and bump the counter.

alter table applications
  add column if not exists referred_by_code text;

alter table profiles
  add column if not exists referred_by    uuid references profiles(id),
  add column if not exists referral_count int not null default 0;

-- ── 2) RATINGS ──────────────────────────────────────────────────────
-- Quick star rating (1–5) + optional comment from a student or parent.
-- Admins read all; a user may only insert their own row.
create table if not exists ratings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null,                                   -- 'student' | 'parent'
  stars      int  not null check (stars between 1 and 5),
  comment    text not null default '',
  created_at timestamptz not null default now()
);

alter table ratings enable row level security;

-- A user may submit a rating only as themselves.
drop policy if exists "insert own rating" on ratings;
create policy "insert own rating" on ratings
  for insert with check (user_id = auth.uid());

-- Only admins read ratings (the API also uses the service role, which bypasses
-- RLS — this is defence in depth).
drop policy if exists "admins read ratings" on ratings;
create policy "admins read ratings" on ratings
  for select using (is_admin());

create index if not exists ratings_created on ratings (created_at desc);

commit;
