-- ════════════════════════════════════════════════════════════════
--  D-MATHS — SKILL TREE / KNOWLEDGE MAP
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: turn progress into a visible journey. Every practice round and mock
--  exam accumulates a learner's correct/total per topic here; /portal/skills
--  draws the question-bank topics as a map, each coloured by mastery
--  (new → learning → proficient → mastered). Writes go through the practice
--  and mock APIs (service role); a learner reads only their own.
-- ════════════════════════════════════════════════════════════════

create table if not exists topic_mastery (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  subject    text not null,
  topic      text not null,
  correct    int  not null default 0,
  total      int  not null default 0,
  updated_at timestamptz not null default now(),
  unique (student_id, subject, topic)
);
create index if not exists topic_mastery_student_idx on topic_mastery (student_id);

alter table topic_mastery enable row level security;

drop policy if exists "read own mastery" on topic_mastery;
create policy "read own mastery" on topic_mastery
  for select using (student_id = auth.uid() or is_staff());

-- ✅ Check: sit a practice round / mock exam, then open /portal/skills — the
--    topics you answered light up by how well you did.
