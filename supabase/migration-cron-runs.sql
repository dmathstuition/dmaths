-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — SCHEDULED JOB HEARTBEAT
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: the portal leans on 6–8 cron jobs for class reminders, nudges,
--  broadcasts and reminder emails. Until now nothing recorded whether
--  any of them actually ran — an assignment-reminder job sat broken,
--  returning an error on every single run, and nothing surfaced it.
--
--  Each job now stamps a row here when it completes. Admin → System
--  health reads them and shows a job red once it is overdue, so a
--  silent failure is visible in seconds instead of never.
--
--  One row per job; the newest run overwrites the previous one.
-- ════════════════════════════════════════════════════════════════════

create table if not exists cron_runs (
  job          text primary key,          -- 'nudges', 'classes', 'broadcasts'…
  last_run_at  timestamptz not null default now(),
  last_status  text not null default 'ok',
  last_detail  jsonb not null default '{}',   -- whatever the job reported
  runs         bigint not null default 1      -- lifetime count, for sanity checks
);

alter table cron_runs enable row level security;

-- Admins read it; every write comes from the service role, which bypasses RLS.
-- There is deliberately no insert/update policy.
drop policy if exists "admin reads cron runs" on cron_runs;
create policy "admin reads cron runs" on cron_runs
  for select using (is_admin());

-- ✅ Check: trigger any cron URL with its key, then open Admin → System
--    health — that job turns green with "last ran a few seconds ago".
