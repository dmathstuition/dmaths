-- Behaviour types catalogue and per-student log
-- Apply in Supabase dashboard after deploying.

create table if not exists behavior_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null check (category in ('positive', 'negative')),
  points     int  not null,
  icon       text not null default 'checkCircle',
  color      text not null default '#10B981',
  is_active  boolean not null default true,
  sort_order int not null default 0
);

create table if not exists behavior_logs (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references profiles on delete cascade,
  behavior_type_id uuid not null references behavior_types,
  notes            text,
  logged_by        uuid not null references profiles,
  created_at       timestamptz not null default now()
);

alter table profiles
  add column if not exists reward_points   int not null default 0,
  add column if not exists sanction_points int not null default 0;

-- RLS ────────────────────────────────────────────────────────────────
alter table behavior_types enable row level security;
create policy "everyone_read_behavior_types" on behavior_types
  for select using (true);
create policy "admins_manage_behavior_types" on behavior_types
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

alter table behavior_logs enable row level security;
create policy "students_read_own_logs" on behavior_logs
  for select using (
    auth.uid() = student_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "admins_insert_logs" on behavior_logs
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create index if not exists behavior_logs_student_created
  on behavior_logs (student_id, created_at desc);

-- Seed 20 behaviours ─────────────────────────────────────────────────
insert into behavior_types (name, category, points, icon, color, sort_order) values
  -- Positive
  ('Good work',            'positive',  2, 'checkCircle',   '#10B981', 1),
  ('Excellent work',       'positive',  3, 'trophy',        '#10B981', 2),
  ('Homework completed',   'positive',  2, 'curriculum',    '#10B981', 3),
  ('Class participation',  'positive',  1, 'zap',           '#10B981', 4),
  ('Exceeding target',     'positive',  3, 'trophy',        '#10B981', 5),
  ('Good conduct',         'positive',  2, 'thumbsUp',      '#10B981', 6),
  ('Punctuality',          'positive',  1, 'calendar',      '#10B981', 7),
  ('Honesty',              'positive',  2, 'thumbsUp',      '#10B981', 8),
  ('Helping peers',        'positive',  2, 'students',      '#10B981', 9),
  ('Making progress',      'positive',  2, 'progress',      '#10B981', 10),
  -- Negative
  ('Late to class',        'negative', -1, 'calendar',      '#EF4444', 1),
  ('Homework not done',    'negative', -2, 'curriculum',    '#EF4444', 2),
  ('Disruptive behaviour', 'negative', -2, 'alertTriangle', '#EF4444', 3),
  ('Misconduct',           'negative', -3, 'thumbsDown',    '#EF4444', 4),
  ('Disrespect',           'negative', -2, 'thumbsDown',    '#EF4444', 5),
  ('Repeated offence',     'negative', -3, 'alertTriangle', '#EF4444', 6),
  ('Online disruption',    'negative', -2, 'zap',           '#EF4444', 7),
  ('Lack of equipment',    'negative', -1, 'curriculum',    '#EF4444', 8),
  ('Cheating',             'negative', -3, 'alertTriangle', '#EF4444', 9),
  ('Absenteeism',          'negative', -2, 'calendar',      '#EF4444', 10);
