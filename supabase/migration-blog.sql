-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — BLOG + NEWSLETTER
--  A standard, public blog the admin manages from the portal (post, edit,
--  modify) with per-post presentation controls (layout + accent), plus a
--  newsletter where visitors register their email for blog updates.
--  Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ════════════════════════════════════════════════════════════════════

-- ── Posts ────────────────────────────────────────────────────────────
create table if not exists blog_posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  excerpt       text default '',
  body          text default '',                 -- lightweight markdown (## , - , **bold**, links)
  cover_url     text default '',
  category      text default '',
  tags          text[] not null default '{}',
  layout        text not null default 'standard',-- how the post is designed: standard|wide|minimal
  accent        text not null default 'gold',    -- accent colour: gold|navy|green|plum
  status        text not null default 'draft',   -- draft|published
  author        text default 'D-Maths',
  featured      boolean not null default false,  -- pin to the top of the blog
  published_at  timestamptz,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists blog_posts_status_idx    on blog_posts(status);
create index if not exists blog_posts_published_idx  on blog_posts(published_at desc);

alter table blog_posts enable row level security;

-- Anyone (including anon) may read PUBLISHED posts — it's a public blog.
-- Drafts and all writes go through the service-role admin API only.
drop policy if exists "published posts are public" on blog_posts;
create policy "published posts are public" on blog_posts
  for select using (status = 'published');

-- ── Newsletter subscribers ───────────────────────────────────────────
create table if not exists blog_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,          -- stored lower-cased
  source          text default 'blog',
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists blog_subscribers_created_idx on blog_subscribers(created_at desc);

alter table blog_subscribers enable row level security;
-- No public policies: subscribing and reading the list both go through the
-- service-role API (public subscribe route / admin-only list).

-- Track when subscribers were emailed about a post (prevents duplicate blasts).
alter table blog_posts add column if not exists announced_at timestamptz;
