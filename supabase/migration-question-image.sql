-- ════════════════════════════════════════════════════════════════
--  D-MATHS — IMAGES ON QUESTIONS
--  Run in: Supabase Dashboard → SQL Editor → New query
--  Idempotent — safe to run again.
--
--  Why: maths & science questions often need a figure (a diagram, graph
--  or geometry sketch). This adds an optional image to a bank question,
--  shown in practice, mocks, CBT and the Boss Battle. One nullable text
--  column holding the image's public URL; every route reads it defensively
--  so this can be run at any time.
-- ════════════════════════════════════════════════════════════════

alter table question_bank add column if not exists image_url text default '';

-- Images live in a public storage bucket so they can be shown without a signed
-- URL. Create it once (safe to re-run).
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

-- ✅ Check: in Admin → Question bank, attach an image to a question; it then
--    appears with that question in practice, mocks, CBT and the Boss.
