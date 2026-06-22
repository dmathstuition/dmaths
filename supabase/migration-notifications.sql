create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

-- Each user may only read/update their own rows; service role inserts freely
create policy "own_notifications" on notifications
  for all using (auth.uid() = user_id);

create index if not exists notifications_user_created
  on notifications (user_id, created_at desc);
