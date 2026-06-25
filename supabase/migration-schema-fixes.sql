-- SCHEMA FIXES — idempotent, run after all previous migrations.
-- Adds columns that API routes depend on but were missing from the original schema.

-- classes: admin can lock a session after confirming attendance so self-marks
-- can no longer be changed.
alter table classes
  add column if not exists attendance_locked boolean not null default false;

-- notices: tracks whether an announcement has been emailed so admins
-- can't accidentally blast the same notice twice, and can see send stats.
alter table notices
  add column if not exists emailed_at         timestamptz,
  add column if not exists emailed_count      int not null default 0,
  add column if not exists email_failed_count int not null default 0;

-- attendance_records: student self-mark fields used by the /attendance/join
-- endpoint (student clicks "Join class" to provisionally mark themselves present).
alter table attendance_records
  add column if not exists self_marked boolean    not null default false,
  add column if not exists joined_at  timestamptz;

-- badges: enable RLS (the table was created without it).
-- The catalogue is read-only for all signed-in users; writes happen only via
-- the service-role migration seed — no client-side write policy is needed.
alter table badges enable row level security;
drop policy if exists "signed-in read badges" on badges;
create policy "signed-in read badges" on badges for select using (auth.uid() is not null);
