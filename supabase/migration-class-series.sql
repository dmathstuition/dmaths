-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — WEEKLY RECURRING CLASSES
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
-- ════════════════════════════════════════════════════════════════════

-- A "weekly" class is generated as several normal class rows (one per week),
-- all sharing the same series_id so they can be shown as a series and deleted
-- together. Null for one-off classes.
alter table classes
  add column if not exists series_id uuid;

create index if not exists classes_series on classes (series_id);
