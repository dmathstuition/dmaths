-- ════════════════════════════════════════════════════════════════
--  D-MATHS — APP SETTINGS (global key/value, for Happy Hour)
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: a tiny global settings store. First use is "Happy Hour" — an admin
--  starts a window during which practice, mocks and flashcards pay 2× reward
--  points (key 'happy_hour_until' = an ISO timestamp). Writes go through
--  /api/happy-hour (admin, service role); anyone signed in may read the current
--  window so the portal can show a "2× active" banner.
-- ════════════════════════════════════════════════════════════════

create table if not exists app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

drop policy if exists "read app settings" on app_settings;
create policy "read app settings" on app_settings
  for select using (auth.uid() is not null);

-- Writes are service-role only (the API checks the caller is an admin).

-- ✅ Check: an admin starts Happy Hour on /admin/rewards; learners see a "2×
--    points" banner and practice/mocks/flashcards pay double until it ends.
