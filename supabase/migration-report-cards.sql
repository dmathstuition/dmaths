-- ════════════════════════════════════════════════════════════════
--  D-MATHS — REPORT CARDS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Admins issue a termly progress report per student (a point-in-time
--  snapshot + a remark); the learner and their parent download a PDF.
-- ════════════════════════════════════════════════════════════════

create table if not exists report_cards (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references profiles(id) on delete cascade,
  term            text not null,                 -- e.g. "First Term 2025/26" / "Summer Camp 2026"
  avg_score       int  default 0,                -- snapshot at issue time
  attendance      int  default 0,
  reward_points   int  default 0,
  sanction_points int  default 0,
  remark          text default '',               -- the tutor's / head's comment
  serial          text not null,
  issued_by       uuid references profiles(id) on delete set null,
  issued_at       timestamptz not null default now()
);

create index if not exists report_cards_student_idx on report_cards (student_id, issued_at desc);

alter table report_cards enable row level security;

-- A learner reads their own; staff (admin/tutor) read all. Parents are
-- authorised in-page via their parent_student_links (service-role read).
drop policy if exists "read own report cards" on report_cards;
create policy "read own report cards" on report_cards
  for select using (student_id = auth.uid() or is_staff());

drop policy if exists "staff write report cards" on report_cards;
create policy "staff write report cards" on report_cards
  for all using (is_staff()) with check (is_staff());
