-- Remove direct storage.objects DELETE (no longer permitted) from cleanup triggers.
-- Storage file cleanup is handled via the Storage API from the app layer.

CREATE OR REPLACE FUNCTION public.cleanup_proofs_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    DELETE FROM public.task_submission_proofs WHERE submission_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_proofs_on_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    DELETE FROM public.task_submission_proofs
    WHERE submission_id IN (SELECT id FROM public.task_submissions WHERE task_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Allow task publishers (and admins) to delete proof files in storage
-- so the app can clean up after approval/completion.
DROP POLICY IF EXISTS "Publishers and admins can delete proofs" ON storage.objects;
CREATE POLICY "Publishers and admins can delete proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'proofs'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.task_submission_proofs p
      JOIN public.task_submissions s ON s.id = p.submission_id
      JOIN public.tasks t ON t.id = s.task_id
      WHERE t.publisher_id = auth.uid()
        AND (p.image_url LIKE '%' || storage.objects.name OR storage.objects.name = p.image_url)
    )
  )
);