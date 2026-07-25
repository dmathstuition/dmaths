-- ════════════════════════════════════════════════════════════════
--  D-MATHS — CLEAN UP DUPLICATE ENGAGEMENT NUDGES
--  Run in: Supabase Dashboard → SQL Editor → New query
--
--  Why: before the fix, /api/reminders/nudges re-sent the streak /
--  "we've missed you" notification on EVERY cron run (a job left on
--  cron-job.org's default "every minute" schedule produced one per
--  minute). This deletes the duplicates, keeping only the newest one
--  per learner per day. Safe to run more than once.
--
--  Check first, delete second — run the SELECT to see the damage.
-- ════════════════════════════════════════════════════════════════

-- 1) How many nudge notifications exist, and how many are duplicates?
select
  count(*)                                                        as nudge_rows,
  count(*) - count(distinct (user_id, date_trunc('day', created_at))) as duplicates_to_delete
from notifications
where title in ('🔥 Keep your streak going!', 'We''ve missed you 👋')
   or title like '🔥 Keep your%streak%';   -- pre-fix titles embedded the day count

-- 2) Delete the duplicates, keeping the most recent per learner per day.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, date_trunc('day', created_at)
      order by created_at desc
    ) as rn
  from notifications
  where title in ('🔥 Keep your streak going!', 'We''ve missed you 👋')
     or title like '🔥 Keep your%streak%'
)
delete from notifications
where id in (select id from ranked where rn > 1);

-- 3) Confirm: this should now return 0 duplicates.
select
  count(*)                                                        as nudge_rows,
  count(*) - count(distinct (user_id, date_trunc('day', created_at))) as duplicates_remaining
from notifications
where title in ('🔥 Keep your streak going!', 'We''ve missed you 👋')
   or title like '🔥 Keep your%streak%';
