-- Badges catalogue
create table if not exists badges (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  description      text not null,
  icon             text not null default 'trophy',
  color            text not null default '#F59E0B',
  points_threshold int
);

-- Per-student earned badges (unique constraint prevents double-award)
create table if not exists student_badges (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles on delete cascade,
  badge_id   uuid not null references badges,
  earned_at  timestamptz not null default now(),
  unique(student_id, badge_id)
);
alter table student_badges enable row level security;
create policy "student own badges"    on student_badges for select using (student_id = auth.uid());
create policy "admin all badges"      on student_badges using (is_admin());

-- Seed 6 badges
insert into badges (slug, name, description, icon, color, points_threshold) values
  ('first_step',    'First Step',    'Earn your first reward point',        'checkCircle', '#10B981',  1),
  ('rising_star',   'Rising Star',   'Reach 25 reward points',              'zap',         '#F59E0B', 25),
  ('star_learner',  'Star Learner',  'Reach 50 reward points',              'trophy',      '#3B82F6', 50),
  ('gold_scholar',  'Gold Scholar',  'Reach 100 reward points',             'trophy',      '#8B5CF6',100),
  ('champion',      'Champion',      'Reach 250 reward points',             'trophy',      '#EF4444',250),
  ('perfect_score', 'Perfect Score', 'Score 100/100 on an assignment',      'trophy',      '#EC4899', null)
on conflict (slug) do nothing;

-- Grade target per student (admin-set goal)
alter table profiles add column if not exists grade_target int check (grade_target between 0 and 100);

-- Guardian portal tokens — no login required, token is the secret
create table if not exists guardian_tokens (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references profiles on delete cascade,
  guardian_email text not null,
  token          uuid not null unique default gen_random_uuid(),
  expires_at     timestamptz not null default (now() + interval '90 days'),
  created_at     timestamptz not null default now()
);
alter table guardian_tokens enable row level security;
-- No public access — service role only (token IS the credential)
create policy "guardian tokens service only" on guardian_tokens using (false);

-- Ensure admin can read/write attendance records (browser client RLS)
create policy if not exists "admin read attendance"  on attendance_records for select using (is_admin());
create policy if not exists "admin write attendance" on attendance_records for all    using (is_admin());
