-- ════════════════════════════════════════════════════════════════
--  D-MATHS PORTAL — SUPABASE SCHEMA
--  Run this ONCE in: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════

-- ── Enums ────────────────────────────────────────────────────────
create type user_role         as enum ('student','admin');
create type app_status        as enum ('pending','approved','rejected');
create type assignment_type   as enum ('written','cbt');
create type submission_status as enum ('pending','submitted','graded');

-- Sequence for human-readable student codes (DM-2026-0001)
create sequence student_code_seq start 1;

-- ── Tables ───────────────────────────────────────────────────────

-- One row per login account (links to Supabase Auth)
create table profiles (
  id               uuid primary key references auth.users on delete cascade,
  role             user_role not null default 'student',
  student_code     text unique,                 -- null for admins
  first_name       text not null,
  last_name        text not null,
  email            text not null,
  phone            text default '',
  dob              date,
  address          text default '',
  school           text default '',
  level            text default '',
  guardian_name    text default '',
  guardian_contact text default '',
  subjects         text[] not null default '{}',
  avg_score        int  not null default 0 check (avg_score between 0 and 100),
  attendance       int  not null default 0 check (attendance between 0 and 100),
  stars            int  not null default 0 check (stars between 0 and 5),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table applications (
  id               uuid primary key default gen_random_uuid(),
  first_name       text not null,
  last_name        text not null,
  email            text not null,
  phone            text not null,
  dob              date,
  address          text default '',
  level            text not null,
  guardian_name    text not null,
  guardian_contact text not null,
  subjects         text[] not null default '{}',
  notes            text default '',
  payment_ref      text not null,
  payment_method   text not null,
  payment_amount   numeric not null,
  payment_date     date,
  status           app_status not null default 'pending',
  rejection_reason text,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);

create table classes (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  tutor            text not null,
  platform         text not null default 'Zoom',
  starts_at        timestamptz not null,
  duration_minutes int not null default 60,
  link             text default '',
  created_at       timestamptz not null default now()
);

create table class_students (
  class_id   uuid references classes  on delete cascade,
  student_id uuid references profiles on delete cascade,
  primary key (class_id, student_id)
);

create table assignments (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subject      text not null,
  type         assignment_type not null default 'written',
  instructions text default '',
  due_date     date,
  cbt_link     text default '',
  cbt_open     timestamptz,
  cbt_close    timestamptz,
  created_at   timestamptz not null default now()
);

-- Per-student status — fixes the old single-status-per-assignment bug
create table assignment_submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments on delete cascade,
  student_id    uuid not null references profiles    on delete cascade,
  status        submission_status not null default 'pending',
  submitted_at  timestamptz,
  grade         int check (grade between 0 and 100),
  feedback      text default '',
  unique (assignment_id, student_id)
);

create table notices (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  target     text not null default 'all',  -- 'all' or a subject name
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);

create table attendance_records (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references classes  on delete cascade,
  student_id   uuid not null references profiles on delete cascade,
  session_date date not null default current_date,
  present      boolean not null,
  unique (class_id, student_id, session_date)
);

create table admin_notes (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles on delete cascade,
  note       text not null,
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);

create table rewards (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles on delete cascade,
  stars      int not null check (stars between 1 and 5),
  message    text not null,
  created_at timestamptz not null default now()
);

create table contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text default '',
  subject    text default '',
  message    text not null,
  created_at timestamptz not null default now()
);

-- Server-side audit log (replaces the old sessionStorage "audit log")
create table audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references profiles,
  action     text not null,
  detail     jsonb default '{}',
  created_at timestamptz not null default now()
);

-- ── Helper functions ─────────────────────────────────────────────

-- True if the current JWT belongs to an admin
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Next student code, e.g. DM-2026-0042
create or replace function next_student_code() returns text
language sql security definer set search_path = public as $$
  select 'DM-' || to_char(now(),'YYYY') || '-' ||
         lpad(nextval('student_code_seq')::text, 4, '0');
$$;

-- Login by Student ID: resolve code → email (called from login page)
create or replace function student_code_to_email(code text) returns text
language sql stable security definer set search_path = public as $$
  select email from profiles
  where upper(student_code) = upper(trim(code)) and is_active = true
  limit 1;
$$;

-- ── Auto-recompute averages (triggers) ───────────────────────────

create or replace function recompute_avg_score() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set avg_score = coalesce((
    select round(avg(grade)) from assignment_submissions
    where student_id = new.student_id and status = 'graded' and grade is not null
  ), 0)
  where id = new.student_id;
  return new;
end; $$;

create trigger trg_avg_score
after insert or update of grade, status on assignment_submissions
for each row execute function recompute_avg_score();

create or replace function recompute_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set attendance = coalesce((
    select round(100.0 * count(*) filter (where present) / count(*))
    from attendance_records where student_id = new.student_id
  ), 0)
  where id = new.student_id;
  return new;
end; $$;

create trigger trg_attendance
after insert or update on attendance_records
for each row execute function recompute_attendance();

-- ── Row Level Security ───────────────────────────────────────────
alter table profiles               enable row level security;
alter table applications           enable row level security;
alter table classes                enable row level security;
alter table class_students         enable row level security;
alter table assignments            enable row level security;
alter table assignment_submissions enable row level security;
alter table notices                enable row level security;
alter table attendance_records     enable row level security;
alter table admin_notes            enable row level security;
alter table rewards                enable row level security;
alter table contact_messages       enable row level security;
alter table audit_log              enable row level security;

-- profiles: students see/update themselves; admins see/manage everyone
create policy "own profile read"   on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id = auth.uid() or is_admin());
create policy "admin manage profiles" on profiles for all using (is_admin());

-- applications: anonymous INSERT (public enrolment form); admin everything else
create policy "public can apply"   on applications for insert with check (true);
create policy "admin manage apps"  on applications for all using (is_admin());

-- classes: students read their own classes; admins manage
create policy "students read own classes" on classes for select using (
  is_admin() or exists (
    select 1 from class_students cs
    where cs.class_id = classes.id and cs.student_id = auth.uid()
  )
);
create policy "admin manage classes" on classes for all using (is_admin());
create policy "read own roster"      on class_students for select using (student_id = auth.uid() or is_admin());
create policy "admin manage roster"  on class_students for all using (is_admin());

-- assignments / submissions
create policy "students read own assignments" on assignments for select using (
  is_admin() or exists (
    select 1 from assignment_submissions s
    where s.assignment_id = assignments.id and s.student_id = auth.uid()
  )
);
create policy "admin manage assignments" on assignments for all using (is_admin());
create policy "read own submissions"  on assignment_submissions for select using (student_id = auth.uid() or is_admin());
create policy "submit own work"       on assignment_submissions for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and status = 'submitted' and grade is null);
create policy "admin manage submissions" on assignment_submissions for all using (is_admin());

-- notices: all signed-in users read; admins write
create policy "signed-in read notices" on notices for select using (auth.uid() is not null);
create policy "admin manage notices"   on notices for all using (is_admin());

-- attendance / notes / rewards
create policy "read own attendance"   on attendance_records for select using (student_id = auth.uid() or is_admin());
create policy "admin manage attendance" on attendance_records for all using (is_admin());
create policy "admin only notes"      on admin_notes for all using (is_admin());
create policy "read own rewards"      on rewards for select using (student_id = auth.uid() or is_admin());
create policy "admin manage rewards"  on rewards for all using (is_admin());

-- contact: anonymous insert, admin read
create policy "public can contact"  on contact_messages for insert with check (true);
create policy "admin read contact"  on contact_messages for select using (is_admin());

-- audit: admin read only (writes happen via service role in API routes)
create policy "admin read audit" on audit_log for select using (is_admin());

-- ════════════════════════════════════════════════════════════════
--  AFTER RUNNING THIS FILE — create your first admin:
--  1. Supabase Dashboard → Authentication → Users → Add user
--     (email + password, check "Auto confirm")
--  2. Copy the new user's UUID, then run:
--
--  insert into profiles (id, role, first_name, last_name, email)
--  values ('PASTE-UUID-HERE', 'admin', 'Oladapo', 'Bakare',
--          'dmathstuition@gmail.com');
-- ════════════════════════════════════════════════════════════════
