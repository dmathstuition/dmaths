-- ════════════════════════════════════════════════════════════════
--  D-MATHS — AVATAR STUDIO (character + frame customization)
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: a second reward-points sink and a bit of self-expression. Learners
--  pick their character mascot (free) and unlock a name TITLE shown next to
--  their name across the portal. Free titles are always available; premium
--  titles are bought with reward points — recorded as a normal
--  reward_redemptions row (item_id null), so the *spendable* balance drops
--  exactly like a shop purchase while reward_points (the leaderboard total) is
--  untouched.
--
--  The equipped choices live on the profile; owned premium titles live in
--  learner_cosmetics. All writes go through /api/cosmetics (service role),
--  which enforces the balance check — so there are no learner write policies.
-- ════════════════════════════════════════════════════════════════

alter table profiles add column if not exists avatar_choice text; -- character key, null = deterministic
alter table profiles add column if not exists avatar_title  text; -- title key, null/'none' = no title

create table if not exists learner_cosmetics (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  kind       text not null,               -- 'title' (room for more later)
  key        text not null,               -- e.g. 'whiz'
  created_at timestamptz not null default now(),
  unique (student_id, kind, key)
);
create index if not exists learner_cosmetics_student_idx on learner_cosmetics (student_id);

alter table learner_cosmetics enable row level security;

drop policy if exists "read own cosmetics" on learner_cosmetics;
create policy "read own cosmetics" on learner_cosmetics
  for select using (student_id = auth.uid() or is_staff());

-- ✅ Check: /portal/style loads, picking a character updates the top-bar
--    avatar, and unlocking a premium title spends points (shop balance drops)
--    and shows the title next to the learner's name.
