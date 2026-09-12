-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — BLOG ENGAGEMENT (reactions + comments)
--  Visitors can react (emoji) to a post and leave comments. Comments are
--  held for admin approval before they show publicly; reactions are live.
--  Run in: Supabase Dashboard → SQL Editor → New query. Idempotent.
-- ════════════════════════════════════════════════════════════════════

-- ── Comments ─────────────────────────────────────────────────────────
create table if not exists blog_comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references blog_posts(id) on delete cascade,
  author_name  text not null default 'Anonymous',
  body         text not null,
  status       text not null default 'pending',  -- pending|approved
  client_id    text,                              -- anonymous per-browser id
  created_at   timestamptz not null default now()
);
create index if not exists blog_comments_post_idx   on blog_comments(post_id);
create index if not exists blog_comments_status_idx on blog_comments(status);

alter table blog_comments enable row level security;
-- Only APPROVED comments are publicly readable; submitting and moderating
-- both go through the service-role API.
drop policy if exists "approved comments are public" on blog_comments;
create policy "approved comments are public" on blog_comments
  for select using (status = 'approved');

-- ── Reactions ────────────────────────────────────────────────────────
-- One row per (post, browser, emoji) so a visitor can toggle and each
-- browser counts once per emoji. Read/written through the service-role API.
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
-- No public policies: all access is via the service-role API.
