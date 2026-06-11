-- ════════════════════════════════════════════════════════════════
--  D-MATHS PORTAL — MIGRATION V2
--  Run this AFTER the original schema.sql in: SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ── CBT questions + file uploads on assignments ────────────────
alter table assignments add column if not exists cbt_questions jsonb;
alter table assignments add column if not exists file_url text default '';
alter table assignments add column if not exists file_name text default '';

-- Student can upload their submission file
alter table assignment_submissions add column if not exists file_url text default '';
alter table assignment_submissions add column if not exists file_name text default '';
-- Store CBT answers + auto-graded score
alter table assignment_submissions add column if not exists cbt_answers jsonb;

-- ── Lesson materials ───────────────────────────────────────────
create table if not exists lesson_materials (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subject     text not null,
  description text default '',
  file_url    text not null,
  file_name   text not null,
  file_size   int default 0,
  uploaded_by uuid references profiles,
  created_at  timestamptz not null default now()
);

alter table lesson_materials enable row level security;
create policy "signed-in read materials" on lesson_materials for select using (auth.uid() is not null);
create policy "admin manage materials"   on lesson_materials for all using (is_admin());

-- ── Curricula / Scheme of work ─────────────────────────────────
create table if not exists curricula (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  level       text not null,
  title       text not null,
  description text default '',
  file_url    text not null,
  file_name   text not null,
  term        text default '',
  uploaded_by uuid references profiles,
  created_at  timestamptz not null default now()
);

alter table curricula enable row level security;
create policy "signed-in read curricula" on curricula for select using (auth.uid() is not null);
create policy "admin manage curricula"   on curricula for all using (is_admin());

-- ── Supabase Storage buckets ───────────────────────────────────
-- Run these or create buckets via Dashboard → Storage
insert into storage.buckets (id, name, public)
values
  ('materials',   'materials',   true),
  ('curricula',   'curricula',   true),
  ('submissions', 'submissions', false),
  ('assignments', 'assignments', true)
on conflict (id) do nothing;

-- Storage policies: public read for materials/curricula/assignments
create policy "public read materials"   on storage.objects for select using (bucket_id = 'materials');
create policy "public read curricula"   on storage.objects for select using (bucket_id = 'curricula');
create policy "public read assignments" on storage.objects for select using (bucket_id = 'assignments');
-- Admin upload to any bucket
create policy "admin upload"            on storage.objects for insert with check (
  (select is_admin())
);
create policy "admin delete"            on storage.objects for delete using (
  (select is_admin())
);
-- Students can upload to submissions bucket
create policy "student upload submission" on storage.objects for insert with check (
  bucket_id = 'submissions' and auth.uid() is not null
);
-- Students can read their own submissions
create policy "student read own submissions" on storage.objects for select using (
  bucket_id = 'submissions' and auth.uid() is not null
);

-- ════════════════════════════════════════════════════════════════
--  CBT JSON FORMAT:
--  [
--    {
--      "id": 1,
--      "question": "What is 2 + 2?",
--      "options": ["3", "4", "5", "6"],
--      "answer": 1
--    }
--  ]
--  answer = zero-based index of the correct option
-- ════════════════════════════════════════════════════════════════
