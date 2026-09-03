-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — PENDING MIGRATIONS (September 2026)
--  Paste this whole block into Supabase → SQL Editor → New query → Run.
--  It is the combined, idempotent (safe to re-run) set of every migration
--  the recent features need. Running it turns on:
--    • Attendance-based hourly billing        (classes.rate_tier, profiles.sub_billed_month)
--    • Application intake profile             (applications.strengths/…)
--    • Aptitude tests                         (aptitude_tests table)  ← fixes "no draft after approval"
--    • Enrolment packages                     (package_tier, school, availability)
--  Mirrors the individual files in this folder; keep them in sync if edited.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Attendance-based hourly billing ──────────────────────────────
alter table classes
  add column if not exists rate_tier text not null default 'standard';
alter table profiles
  add column if not exists sub_billed_month text;

-- ── 2. Application intake profile ───────────────────────────────────
alter table applications
  add column if not exists strengths    text,
  add column if not exists challenges   text,
  add column if not exists weak_points  text,
  add column if not exists exam_date    date,
  add column if not exists target_grade text;

-- ── 3. Enrolment packages ───────────────────────────────────────────
alter table applications
  add column if not exists package_tier text,
  add column if not exists school       text,
  add column if not exists availability text;
alter table profiles
  add column if not exists package_tier text;

-- ── 3b. Aptitude test time chosen at registration ───────────────────
alter table applications
  add column if not exists aptitude_at timestamptz;

-- ── 4. Aptitude tests ───────────────────────────────────────────────
create table if not exists aptitude_tests (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles(id) on delete cascade,
  level         text default '',
  exam_target   text default '',
  questions     jsonb not null default '[]'::jsonb,
  status        text  not null default 'draft',
  scheduled_at  timestamptz,
  answers       jsonb,
  score         int,
  total         int,
  ai_analysis   text,
  report        text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  reported_at   timestamptz
);
create index if not exists aptitude_tests_student_idx on aptitude_tests(student_id);
create index if not exists aptitude_tests_status_idx  on aptitude_tests(status);
alter table aptitude_tests enable row level security;
-- All access is via service-role API routes, so no policies are needed.
