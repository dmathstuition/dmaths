-- ════════════════════════════════════════════════════════════════
--  D-MATHS — A.I CHAT HISTORY
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: the D-Maths A.I now has a full page, and conversations are saved so a
--  learner (or tutor) can come back to them. Each conversation stores its whole
--  message list as JSON on one row — simple to append to and read. Writes go
--  through /api/assistant/history (service role, after an auth check); the
--  policy below also scopes any direct read to the row's owner.
-- ════════════════════════════════════════════════════════════════

create table if not exists ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text not null default 'New chat',
  messages   jsonb not null default '[]',   -- [{ role: 'user'|'assistant', content }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on ai_conversations (user_id, updated_at desc);

alter table ai_conversations enable row level security;

drop policy if exists "own ai conversations" on ai_conversations;
create policy "own ai conversations" on ai_conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ✅ Check: open /portal/assistant, send a message, reload — the chat is still
--    there in the history list.
