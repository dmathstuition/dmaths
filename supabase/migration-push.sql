-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — WEB PUSH NOTIFICATIONS (PWA phase 2)
--  Run in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════════

-- One row per device/browser a user has granted push permission on.
-- The endpoint is the unique push service URL; p256dh + auth are the
-- encryption keys the browser returns. Written from /api/push/subscribe.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text default '',
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- Each user manages only their own subscriptions; the service role (the
-- server-side sender) bypasses RLS, so no separate read policy is needed.
drop policy if exists "own_push_subscriptions" on push_subscriptions;
create policy "own_push_subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists push_subscriptions_user on push_subscriptions (user_id);

-- Idempotency flag so the class-reminder cron never double-sends a reminder
-- for the same class (it stamps this once the reminder goes out).
alter table classes
  add column if not exists reminded_at timestamptz;
