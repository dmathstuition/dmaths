-- ════════════════════════════════════════════════════════════════
--  D-MATHS — MOCK EXAM REQUESTS (request → authorize)
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: mock exams are no longer self-serve. A learner REQUESTS a mock; an
--  admin/teacher approves (optionally scheduling a start time) before it can
--  open. Staff can also LAUNCH a mock directly to chosen learners (an
--  already-approved request + a notification). Papers are still served and
--  graded by /api/mock-exam (service role); this table gates the start and is
--  scoped to the learner's own class.
-- ════════════════════════════════════════════════════════════════

create table if not exists mock_requests (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles(id) on delete cascade,
  subject       text not null default '',
  preset        text not null default 'quick',   -- quick | waec | jamb
  level         text not null default '',         -- snapshot of the learner's class
  status        text not null default 'pending' check (status in ('pending','approved','declined','used')),
  scheduled_for timestamptz,                       -- optional: not startable before this
  note          text default '',                   -- admin's reason / message
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references profiles(id) on delete set null,
  used_at       timestamptz
);
create index if not exists mock_requests_student_idx on mock_requests (student_id, created_at desc);
create index if not exists mock_requests_status_idx  on mock_requests (status, created_at desc);

alter table mock_requests enable row level security;

-- A learner reads their own requests; staff read all. Every write goes through
-- /api/mock-requests (service role), which enforces the request/approve rules —
-- so there is no learner insert/update policy.
drop policy if exists "read own mock requests" on mock_requests;
create policy "read own mock requests" on mock_requests
  for select using (student_id = auth.uid() or is_staff());

-- ✅ Check: a learner can request a mock on /portal/mock-exam; it shows
--    "awaiting approval" until an admin approves it on /admin/mock-requests,
--    after which a "Start" button appears (at the scheduled time, if set).
