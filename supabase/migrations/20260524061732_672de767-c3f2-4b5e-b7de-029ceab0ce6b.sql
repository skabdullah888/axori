
-- 1. Tighten notifications SELECT policy to exclude admin-targeted rows for non-admins
DROP POLICY IF EXISTS user_select_own_notifications ON public.notifications;
CREATE POLICY user_select_own_notifications ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND admin_targeted = false);

-- 2. Tighten proofs read policy: join through task_submission_proofs to verify
-- the specific object belongs to a submission on the publisher's task.
DROP POLICY IF EXISTS proofs_owner_or_publisher_or_admin_read ON storage.objects;
CREATE POLICY proofs_owner_or_publisher_or_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proofs' AND (
      public.has_role(auth.uid(), 'admin')
      OR (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1
        FROM public.task_submission_proofs p
        JOIN public.task_submissions s ON s.id = p.submission_id
        JOIN public.tasks t ON t.id = s.task_id
        WHERE t.publisher_id = auth.uid()
          AND (p.image_url = objects.name OR p.image_url LIKE '%' || objects.name)
      )
    )
  );

-- 3. Set immutable search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
