-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — COMPLETELY DELETE ONE LEARNER AND ALL THEIR RECORDS
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
--
--  This permanently removes the learner's login, profile, and every
--  record linked to them (submissions, attendance, classes, rewards,
--  behaviour logs, badges, guardian/parent links, notifications), plus
--  their original enrolment application and payment-ledger rows.
--
--  ⚠️  THIS CANNOT BE UNDONE. Consider exporting/backing up first.
--  It is wrapped in a transaction: if anything fails, NOTHING is deleted.
-- ════════════════════════════════════════════════════════════════════

begin;

-- Attendance rows may be guarded by an "attendance locked" trigger that refuses
-- any change once a class is finalised — which would block deleting a learner who
-- has locked attendance. Disable user triggers on attendance_records for the
-- duration of this transaction (restored below, and automatically on rollback).
alter table attendance_records disable trigger user;

do $$
declare
  v_id    uuid;
  v_email text;
  t       record;
begin
  -- ┌────────────────────────────────────────────────────────────────┐
  -- │  ✏️  EDIT HERE — identify the learner. Use ONE line; keep the   │
  -- │     other commented out with a leading "--".                    │
  -- └────────────────────────────────────────────────────────────────┘
  select id, email into v_id, v_email from profiles
    where upper(student_code) = upper('DM-2026-0001');        -- ← by Student ID
  -- where lower(email)       = lower('learner@example.com');  -- ← OR by email

  -- ── Safety checks ────────────────────────────────────────────────
  if v_id is null then
    raise exception 'No learner found — check the Student ID / email above.';
  end if;
  if exists (select 1 from profiles where id = v_id and role = 'admin') then
    raise exception 'Refusing to delete an ADMIN account (id %).', v_id;
  end if;

  raise notice 'Deleting learner % (email: %) ...', v_id, v_email;

  -- 1) Delete child rows that belong to the learner.
  --    Tables from un-applied migrations are skipped automatically.
  for t in select * from (values
        ('assignment_submissions','student_id'),
        ('attendance_records',    'student_id'),
        ('class_students',        'student_id'),
        ('admin_notes',           'student_id'),
        ('rewards',               'student_id'),
        ('student_badges',        'student_id'),
        ('guardian_tokens',       'student_id'),
        ('parent_student_links',  'student_id'),
        ('behavior_logs',         'student_id'),
        ('notifications',         'user_id'),
        ('messages',              'student_id'),
        ('messages',              'sender_id'),
        ('ratings',               'user_id'),
        ('push_subscriptions',    'user_id')
      ) as x(tbl, col)
  loop
    begin
      execute format('delete from %I where %I = $1', t.tbl, t.col) using v_id;
    exception when undefined_table or undefined_column then null; -- table not present
    end;
  end loop;

  -- 2) Null out any non-cascade "creator / actor" references so they
  --    can't block the final delete (normally empty for a student).
  for t in select * from (values
        ('audit_log',        'actor_id'),
        ('notices',          'created_by'),
        ('admin_notes',      'created_by'),
        ('behavior_logs',    'logged_by'),
        ('lesson_materials', 'uploaded_by'),
        ('curricula',        'uploaded_by')
      ) as x(tbl, col)
  loop
    begin
      execute format('update %I set %I = null where %I = $1', t.tbl, t.col, t.col) using v_id;
    exception when undefined_table or undefined_column then null;
    end;
  end loop;

  -- 3) Their original enrolment application + payment ledger.
  --    These have NO profile link — they are matched by email, so this
  --    also clears the personal data they submitted at sign-up.
  --    NOTE: if the SAME email was used for more than one learner, this
  --    removes those shared application/payment rows too.
  if coalesce(trim(v_email), '') <> '' then
    for t in select * from (values ('applications'), ('payments')) as x(tbl)
    loop
      begin
        execute format('delete from %I where lower(email) = lower($1)', t.tbl) using v_email;
      exception when undefined_table then null;
      end;
    end loop;
  end if;

  -- 3b) Null any referral link pointing at this learner — that self-FK is not
  --     cascade, so it would otherwise block the profile delete below.
  begin
    update profiles set referred_by = null where referred_by = v_id;
  exception when undefined_column then null; -- referrals migration not applied
  end;

  -- 4) Finally, the profile row and the login account itself.
  --    Removing the auth user is what permanently stops them signing in.
  delete from profiles  where id = v_id;
  delete from auth.users where id = v_id;

  raise notice '✅ Learner % fully deleted.', v_id;
end $$;

-- Restore the attendance-lock trigger.
alter table attendance_records enable trigger user;

commit;
-- If the output shows an error instead of "Learner … fully deleted",
-- the transaction rolled back and nothing was changed — fix and re-run.
