-- Allow owners to replace progress without changing profile identity or events.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.brush_profiles
  ADD COLUMN revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0);

CREATE POLICY brush_profiles_update ON public.brush_profiles
  FOR UPDATE TO authenticated
  USING (owner_id = auth.user_id())
  WITH CHECK (owner_id = auth.user_id());

GRANT UPDATE (baseline, revision) ON public.brush_profiles TO authenticated;

CREATE FUNCTION public.brush_progress_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'Progress revision must advance once' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.brush_progress_revision() FROM PUBLIC;
CREATE TRIGGER brush_progress_revision BEFORE UPDATE ON public.brush_profiles
  FOR EACH ROW EXECUTE FUNCTION public.brush_progress_revision();

COMMIT;
