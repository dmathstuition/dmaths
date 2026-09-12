-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — PENDING MIGRATIONS (September 2026)
--  Paste this whole block into Supabase → SQL Editor → New query → Run.
--  It is the combined, idempotent (safe to re-run) set of every migration
--  the recent features need. Running it turns on:
--    • Attendance-based hourly billing        (classes.rate_tier, profiles.sub_billed_month)
--    • Application intake profile             (applications.strengths/…)
--    • Aptitude tests                         (aptitude_tests table)  ← fixes "no draft after approval"
--    • Enrolment packages                     (package_tier, school, availability)
--    • Blog + newsletter                       (blog_posts, blog_subscribers)
--    • Blog engagement                        (blog_comments, blog_reactions)
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

-- ── Blog + newsletter ────────────────────────────────────────────────
create table if not exists blog_posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  excerpt       text default '',
  body          text default '',
  cover_url     text default '',
  category      text default '',
  tags          text[] not null default '{}',
  layout        text not null default 'standard',  -- standard|wide|minimal
  accent        text not null default 'gold',      -- gold|navy|green|plum
  status        text not null default 'draft',     -- draft|published
  author        text default 'D-Maths',
  featured      boolean not null default false,
  published_at  timestamptz,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists blog_posts_status_idx   on blog_posts(status);
create index if not exists blog_posts_published_idx on blog_posts(published_at desc);
alter table blog_posts enable row level security;
drop policy if exists "published posts are public" on blog_posts;
create policy "published posts are public" on blog_posts for select using (status = 'published');

create table if not exists blog_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  source          text default 'blog',
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists blog_subscribers_created_idx on blog_subscribers(created_at desc);
alter table blog_subscribers enable row level security;
-- Subscribing and reading the list both go through the service-role API.

-- ── Blog engagement: reactions + comments ───────────────────────────
create table if not exists blog_comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references blog_posts(id) on delete cascade,
  author_name  text not null default 'Anonymous',
  body         text not null,
  status       text not null default 'pending',  -- pending|approved
  client_id    text,
  created_at   timestamptz not null default now()
);
create index if not exists blog_comments_post_idx   on blog_comments(post_id);
create index if not exists blog_comments_status_idx on blog_comments(status);
alter table blog_comments enable row level security;
drop policy if exists "approved comments are public" on blog_comments;
create policy "approved comments are public" on blog_comments for select using (status = 'approved');

create table if not exists blog_reactions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references blog_posts(id) on delete cascade,
  client_id   text not null,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (post_id, client_id, emoji)
);
create index if not exists blog_reactions_post_idx on blog_reactions(post_id);
alter table blog_reactions enable row level security;
-- Reactions and comment submission/moderation all go through the service-role API.

-- Blog: track subscriber announcement to prevent duplicate email blasts.
alter table blog_posts add column if not exists announced_at timestamptz;
