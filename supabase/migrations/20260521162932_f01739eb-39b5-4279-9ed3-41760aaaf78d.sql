
-- 1. Fix profiles referral data leak: drop policy, expose safe view via RPC
DROP POLICY IF EXISTS users_select_their_referrals ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE(id uuid, username text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, username, status, created_at
  FROM public.profiles
  WHERE referred_by = auth.uid()
  ORDER BY created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_referrals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;

-- 2. Fix profiles privilege escalation: restrict columns users can self-update
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Allow admins anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Lock sensitive fields for self-updates
  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
     OR NEW.is_publisher IS DISTINCT FROM OLD.is_publisher
     OR NEW.publisher_restricted IS DISTINCT FROM OLD.publisher_restricted
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.activated_at IS DISTINCT FROM OLD.activated_at
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_profile_priv_esc ON public.profiles;
CREATE TRIGGER trg_prevent_profile_priv_esc
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Also tighten the update policy WITH CHECK
DROP POLICY IF EXISTS users_update_own_profile ON public.profiles;
CREATE POLICY users_update_own_profile ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Fix task_submissions: drop publisher direct-update policy (RPC enforces status changes)
DROP POLICY IF EXISTS publisher_update_submissions ON public.task_submissions;

-- 4. Realtime: restrict subscriptions to authenticated users only
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_can_receive_broadcast ON realtime.messages;
CREATE POLICY authenticated_can_receive_broadcast ON realtime.messages
  FOR SELECT TO authenticated USING (true);

-- 5. Revoke executable SECURITY DEFINER functions from anon/public; trigger functions don't need EXECUTE grants
REVOKE EXECUTE ON FUNCTION public.gen_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_payment_reviewed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_payment_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_submission_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_submission_reviewed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_task_published() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_profile_status_changed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_submission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_active_for_submission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_approved_task_submission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_payment_requests() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

-- has_role and publisher_review_submission must remain callable by authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.publisher_review_submission(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publisher_review_submission(uuid, boolean, text) TO authenticated;

-- 6. Make proofs bucket private and restrict access via RLS
UPDATE storage.buckets SET public = false WHERE id = 'proofs';

DROP POLICY IF EXISTS proofs_public_read ON storage.objects;
DROP POLICY IF EXISTS "Public can read proofs" ON storage.objects;
DROP POLICY IF EXISTS proofs_read ON storage.objects;

CREATE POLICY proofs_owner_or_publisher_or_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proofs' AND (
      public.has_role(auth.uid(), 'admin')
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.task_submissions s
        JOIN public.tasks t ON t.id = s.task_id
        WHERE t.publisher_id = auth.uid()
          AND s.user_id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS proofs_user_upload ON storage.objects;
CREATE POLICY proofs_user_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proofs' AND auth.uid()::text = (storage.foldername(name))[1]
  );
