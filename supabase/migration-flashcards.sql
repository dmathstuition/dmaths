-- ════════════════════════════════════════════════════════════════
--  D-MATHS — FLASHCARDS + SPACED REPETITION
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Staff publish revision decks; learners study them with spaced
--  repetition (each learner keeps their own review schedule).
-- ════════════════════════════════════════════════════════════════

create table if not exists flashcard_decks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  subject    text default '',
  owner_id   uuid references profiles(id) on delete set null,
  published  boolean not null default false,   -- visible to all learners
  created_at timestamptz not null default now()
);

create table if not exists flashcards (
  id         uuid primary key default gen_random_uuid(),
  deck_id    uuid not null references flashcard_decks(id) on delete cascade,
  front      text not null,
  back       text not null,
  created_at timestamptz not null default now()
);
create index if not exists flashcards_deck_idx on flashcards (deck_id, created_at);

-- Per-learner scheduling state for a card (SM-2 style).
create table if not exists flashcard_reviews (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles(id) on delete cascade,
  card_id       uuid not null references flashcards(id) on delete cascade,
  reps          int  not null default 0,
  interval_days int  not null default 0,
  ease          numeric not null default 2.5,
  due_on        date not null default current_date,
  last_reviewed timestamptz,
  unique (student_id, card_id)
);
create index if not exists flashcard_reviews_due_idx on flashcard_reviews (student_id, due_on);

alter table flashcard_decks   enable row level security;
alter table flashcards        enable row level security;
alter table flashcard_reviews enable row level security;

-- Decks: everyone signed in reads published decks; staff read/manage all.
drop policy if exists "read decks" on flashcard_decks;
create policy "read decks" on flashcard_decks
  for select using (published or is_staff());
drop policy if exists "staff manage decks" on flashcard_decks;
create policy "staff manage decks" on flashcard_decks
  for all using (is_staff()) with check (is_staff());

-- Cards follow their deck's visibility.
drop policy if exists "read cards" on flashcards;
create policy "read cards" on flashcards
  for select using (
    exists (select 1 from flashcard_decks d where d.id = deck_id and (d.published or is_staff()))
  );
drop policy if exists "staff manage cards" on flashcards;
create policy "staff manage cards" on flashcards
  for all using (is_staff()) with check (is_staff());

-- Reviews are private to the learner (staff may read for coaching).
drop policy if exists "read own reviews" on flashcard_reviews;
create policy "read own reviews" on flashcard_reviews
  for select using (student_id = auth.uid() or is_staff());
drop policy if exists "write own reviews" on flashcard_reviews;
create policy "write own reviews" on flashcard_reviews
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
