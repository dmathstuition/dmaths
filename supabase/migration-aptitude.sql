-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — APTITUDE TESTS
--  A new learner sits an AI-drafted, admin-approved diagnostic in the portal
--  at a time the parent schedules. The result is analysed by the A.I,
--  reviewed by the admin, and released to the parent as a report.
--  Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ════════════════════════════════════════════════════════════════════

create table if not exists aptitude_tests (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles(id) on delete cascade,
  level         text default '',
  exam_target   text default '',
  questions     jsonb not null default '[]'::jsonb,   -- [{question, options[], answer}]
  status        text  not null default 'draft',       -- draft|scheduled|submitted|analyzed|reported
  scheduled_at  timestamptz,                           -- parent-chosen start time
  answers       jsonb,                                 -- {"0":2,"1":0,...}
  score         int,
  total         int,
  ai_analysis   text,                                  -- AI-drafted analysis
  report        text,                                  -- admin-reviewed report shown to the parent
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  reported_at   timestamptz
);

create index if not exists aptitude_tests_student_idx on aptitude_tests(student_id);
create index if not exists aptitude_tests_status_idx  on aptitude_tests(status);

alter table aptitude_tests enable row level security;

-- All reads/writes go through service-role API routes (which enforce who may do
-- what), so no permissive policies are added here. A learner never sees the
-- answer key: the taking route sends questions without the `answer` field.
