-- ════════════════════════════════════════════════════════════════
--  D-MATHS — REWARD POINTS SHOP
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
--
--  Learners spend the reward points they've earned on perks the admin lists.
--  profiles.reward_points stays the TOTAL EARNED (leaderboard unchanged); the
--  spendable balance is that minus points committed to non-rejected redemptions.
-- ════════════════════════════════════════════════════════════════

-- The catalogue (admin-managed).
create table if not exists reward_items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  description text default '',
  cost        int  not null check (cost > 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table reward_items enable row level security;

drop policy if exists "read active items" on reward_items;
create policy "read active items" on reward_items
  for select using (active or is_admin());

drop policy if exists "admin manage items" on reward_items;
create policy "admin manage items" on reward_items
  for all using (is_admin()) with check (is_admin());

-- A learner's redemption of an item.
create table if not exists reward_redemptions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  item_id     uuid references reward_items(id) on delete set null,
  title       text not null,   -- snapshot: the item may be renamed/removed later
  cost        int  not null check (cost > 0),
  status      text not null default 'pending' check (status in ('pending','fulfilled','rejected')),
  note        text default '',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);
create index if not exists reward_redemptions_student_idx on reward_redemptions (student_id, created_at desc);
create index if not exists reward_redemptions_status_idx  on reward_redemptions (status, created_at desc);
alter table reward_redemptions enable row level security;

-- A learner reads their own; staff read all. Every WRITE goes through the
-- service-role API (which enforces the balance check and status changes), so
-- there is deliberately no learner insert/update policy.
drop policy if exists "read own redemptions" on reward_redemptions;
create policy "read own redemptions" on reward_redemptions
  for select using (student_id = auth.uid() or is_staff());
