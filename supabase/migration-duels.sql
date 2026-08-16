-- ════════════════════════════════════════════════════════════════
--  D-MATHS — QUIZ DUEL (async head-to-head)
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: a friendly head-to-head. One learner creates a duel and plays a
--  fixed set of questions; a friend joins by code and plays the SAME set;
--  the higher score wins a reward. Async (no realtime needed) — the two
--  play whenever they like and the server resolves once both are done.
-- ════════════════════════════════════════════════════════════════

create table if not exists duels (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,                 -- short join code
  subject        text not null default '',
  question_ids   jsonb not null default '[]',           -- fixed, shared order
  creator_id     uuid not null references profiles(id) on delete cascade,
  opponent_id    uuid references profiles(id) on delete set null,
  creator_score  int,
  opponent_score int,
  status         text not null default 'open',          -- open | full | resolved
  winner_id      uuid references profiles(id) on delete set null,
  reward         int  not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists duels_code_idx on duels (code);
create index if not exists duels_players_idx on duels (creator_id, opponent_id);

alter table duels enable row level security;

-- A learner can read the duels they're part of (to see status / result). All
-- writes go through /api/duel with the service role.
drop policy if exists "read own duels" on duels;
create policy "read own duels" on duels
  for select using (creator_id = auth.uid() or opponent_id = auth.uid());

-- ✅ Check: /portal/duel — create a duel, play, share the code; a friend joins
--    and plays the same questions, and the higher score wins the reward.
