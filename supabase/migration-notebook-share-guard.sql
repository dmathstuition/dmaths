-- ════════════════════════════════════════════════════════════════════
--  D-MATHS — NOTEBOOK SHARING GUARD (defense in depth)
--  Only staff (admin/tutor) may publish a "shared" notebook. The app enforces
--  this in /api/notebooks/share, but the owner-write RLS policy would still let
--  a learner flip `shared` directly from the browser. This trigger forces
--  shared=false unless the row's owner is staff, regardless of code path.
--  Run AFTER migration-shared-notebooks.sql. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enforce_staff_share() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.shared, false) = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = NEW.user_id AND p.role IN ('admin', 'tutor')
    ) THEN
      NEW.shared := false;
      NEW.shared_by_name := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_share ON code_snippets;
CREATE TRIGGER trg_enforce_staff_share
  BEFORE INSERT OR UPDATE ON code_snippets
  FOR EACH ROW EXECUTE FUNCTION enforce_staff_share();
