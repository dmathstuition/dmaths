-- ════════════════════════════════════════════════════════════════
--  D-MATHS — SCHEDULED BROADCASTS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Lets an admin schedule a broadcast message for a future time. A cron
--  job (/api/cron/broadcasts) sends the due ones and stamps sent_at.
-- ════════════════════════════════════════════════════════════════

create table if not exists scheduled_broadcasts (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,                 -- 'all' | 'level' | 'subject' | 'class'
  value       text default '',               -- level / subject / class id (empty for 'all')
  body        text not null,
  send_at     timestamptz not null,
  sent_at     timestamptz,                   -- null = still pending
  recipients  int,                           -- filled in once sent
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists scheduled_broadcasts_due_idx
  on scheduled_broadcasts (sent_at, send_at);

alter table scheduled_broadcasts enable row level security;

-- Admins manage scheduled broadcasts; the cron uses the service role (bypasses RLS).
drop policy if exists "admin manage scheduled broadcasts" on scheduled_broadcasts;
create policy "admin manage scheduled broadcasts" on scheduled_broadcasts
  for all using (is_admin()) with check (is_admin());
