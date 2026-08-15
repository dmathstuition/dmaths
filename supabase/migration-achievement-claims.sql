-- ════════════════════════════════════════════════════════════════
--  D-MATHS — ACHIEVEMENT REWARDS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: turn the trophy room into a way to EARN. Each unlocked achievement pays
--  a one-time reward-point bonus the learner claims. This table records claims
--  so a bonus can never be paid twice. The +points go through /api/achievements
--  (service role), which checks the achievement is genuinely unlocked first.
-- ════════════════════════════════════════════════════════════════

create table if not exists achievement_claims (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references profiles(id) on delete cascade,
  achievement_id text not null,
  points         int  not null default 0,
  created_at     timestamptz not null default now(),
  unique (student_id, achievement_id)
);
create index if not exists achievement_claims_student_idx on achievement_claims (student_id);

alter table achievement_claims enable row level security;

drop policy if exists "read own achievement claims" on achievement_claims;
create policy "read own achievement claims" on achievement_claims
  for select using (student_id = auth.uid() or is_staff());

-- ✅ Check: on /portal/profile, an unlocked achievement shows a "Claim +N"
--    button that credits the bonus once and then reads "Claimed".
