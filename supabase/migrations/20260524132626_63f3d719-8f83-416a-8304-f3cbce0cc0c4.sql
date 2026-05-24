
-- 1) Drop duplicate proofs INSERT policy
DROP POLICY IF EXISTS proofs_auth_write ON storage.objects;

-- 2) Tighten task insert policy: require is_publisher and not restricted
DROP POLICY IF EXISTS publisher_insert_own_tasks ON public.tasks;
CREATE POLICY publisher_insert_own_tasks ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    publisher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.status = 'active'
        AND coalesce(p.publisher_restricted, false) = false
    )
  );
