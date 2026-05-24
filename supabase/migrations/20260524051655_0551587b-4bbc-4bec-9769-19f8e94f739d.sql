CREATE OR REPLACE FUNCTION public.cleanup_proofs_on_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_paths text[];
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT array_agg(
      CASE
        WHEN position('/proofs/' in p.image_url) > 0
          THEN substring(p.image_url from position('/proofs/' in p.image_url) + 8)
        ELSE regexp_replace(p.image_url, '^/+', '')
      END
    )
    INTO v_paths
    FROM public.task_submission_proofs p
    JOIN public.task_submissions s ON s.id = p.submission_id
    WHERE s.task_id = NEW.id;

    IF v_paths IS NOT NULL AND array_length(v_paths, 1) > 0 THEN
      DELETE FROM storage.objects WHERE bucket_id = 'proofs' AND name = ANY(v_paths);
    END IF;

    DELETE FROM public.task_submission_proofs
    WHERE submission_id IN (SELECT id FROM public.task_submissions WHERE task_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_proofs_on_task_completed ON public.tasks;
CREATE TRIGGER trg_cleanup_proofs_on_task_completed
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.cleanup_proofs_on_task_completed();