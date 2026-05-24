-- Auto-delete proof images from storage when a submission is approved
CREATE OR REPLACE FUNCTION public.cleanup_proofs_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_paths text[];
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    SELECT array_agg(
      CASE
        WHEN position('/proofs/' in image_url) > 0
          THEN substring(image_url from position('/proofs/' in image_url) + 8)
        ELSE regexp_replace(image_url, '^/+', '')
      END
    )
    INTO v_paths
    FROM public.task_submission_proofs
    WHERE submission_id = NEW.id;

    IF v_paths IS NOT NULL AND array_length(v_paths, 1) > 0 THEN
      DELETE FROM storage.objects WHERE bucket_id = 'proofs' AND name = ANY(v_paths);
    END IF;

    DELETE FROM public.task_submission_proofs WHERE submission_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_proofs_on_approval ON public.task_submissions;
CREATE TRIGGER trg_cleanup_proofs_on_approval
AFTER UPDATE ON public.task_submissions
FOR EACH ROW EXECUTE FUNCTION public.cleanup_proofs_on_approval();