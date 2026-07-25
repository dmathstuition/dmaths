-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — EMAIL SEND LOG  (stops duplicate reminder emails)
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: the assignment-reminder and guardian-digest endpoints can now be
--  driven by cron. Without a record of what has already gone out, a cron
--  set to "every minute" (which is cron-job.org's default!) would email
--  the same parent every minute. Each send claims a row here first; the
--  unique index makes a second claim on the same day fail, so the email
--  is skipped rather than repeated.
--
--  One row = "this kind of email, to this address, about this thing, on
--  this day (WAT)".
-- ════════════════════════════════════════════════════════════════════

create table if not exists email_log (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,                 -- 'assignment_reminder' | 'guardian_digest'
  recipient  text not null,                 -- the email address we sent to
  ref        text not null default '',      -- assignment id / student id, '' when not needed
  sent_on    date not null default ((now() at time zone 'Africa/Lagos')::date),
  created_at timestamptz not null default now()
);

-- The guard itself: one send per kind + recipient + subject + day.
create unique index if not exists email_log_once_per_day
  on email_log (kind, recipient, ref, sent_on);

-- Handy for "what went out this week?" without scanning.
create index if not exists email_log_sent_on_idx on email_log (sent_on desc);

alter table email_log enable row level security;

-- Nobody reads this from the browser except an admin; all writes come from
-- the service role, which bypasses RLS.
drop policy if exists "admin reads email log" on email_log;
create policy "admin reads email log" on email_log
  for select using (is_admin());

-- ✅ Check: Supabase → Table Editor shows `email_log`. Hitting the
--    assignment-reminder endpoint twice in a day reports the second run as
--    { sent: 0, skipped: N }.
