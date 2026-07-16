-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — PHYSICAL (IN-PERSON) CLASSES
--  Lets a class be marked as in-person with a venue, alongside online classes.
--  Manual attendance already works on every class; this just adds the mode +
--  location so the summer in-person camp (Asaba) can be scheduled and run.
--  Run in Supabase → SQL Editor. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE classes ADD COLUMN IF NOT EXISTS mode     text NOT NULL DEFAULT 'online';  -- 'online' | 'physical'
ALTER TABLE classes ADD COLUMN IF NOT EXISTS location text;                            -- venue for in-person classes
