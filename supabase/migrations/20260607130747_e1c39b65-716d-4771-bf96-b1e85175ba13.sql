
-- 1. Extend privilege escalation trigger to cover more sensitive fields
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF current_setting('role', true) = 'none' OR session_user = 'postgres' THEN
    NULL;
  END IF;
  IF NEW.trust_score IS DISTINCT FROM OLD.trust_score
     OR NEW.publisher_restricted IS DISTINCT FROM OLD.publisher_restricted
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.activated_at IS DISTINCT FROM OLD.activated_at
     OR NEW.last_activation_request_at IS DISTINCT FROM OLD.last_activation_request_at
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.signup_ip IS DISTINCT FROM OLD.signup_ip
     OR NEW.is_publisher IS DISTINCT FROM OLD.is_publisher
  THEN
    RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
  END IF;
  IF (NEW.withdrawal_account IS DISTINCT FROM OLD.withdrawal_account
      OR NEW.withdrawal_method IS DISTINCT FROM OLD.withdrawal_method)
     AND coalesce(current_setting('app.allow_withdrawal_update', true), '') <> '1'
  THEN
    RAISE EXCEPTION 'Withdrawal destination can only be changed via set_withdrawal_destination after re-authentication';
  END IF;
  RETURN NEW;
END $function$;

-- NOTE: profile-related triggers (last_activation_request_at, is_publisher, balance, activated_at)
-- are set by SECURITY DEFINER functions/triggers which bypass this check appropriately.
-- But direct UPDATE from profile page to last_activation_request_at must be allowed.
-- Let's allow last_activation_request_at to be updated by user (it's a request marker, not a privilege).
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.trust_score IS DISTINCT FROM OLD.trust_score
     OR NEW.publisher_restricted IS DISTINCT FROM OLD.publisher_restricted
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.activated_at IS DISTINCT FROM OLD.activated_at
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.signup_ip IS DISTINCT FROM OLD.signup_ip
     OR NEW.is_publisher IS DISTINCT FROM OLD.is_publisher
  THEN
    RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
  END IF;
  IF (NEW.withdrawal_account IS DISTINCT FROM OLD.withdrawal_account
      OR NEW.withdrawal_method IS DISTINCT FROM OLD.withdrawal_method)
     AND coalesce(current_setting('app.allow_withdrawal_update', true), '') <> '1'
  THEN
    RAISE EXCEPTION 'Withdrawal destination can only be changed via set_withdrawal_destination after re-authentication';
  END IF;
  RETURN NEW;
END $function$;

-- 2. Set fixed search_path on email queue helper functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

-- 3. Add owner-scoped UPDATE policy on task-banners bucket
DROP POLICY IF EXISTS "task_banners_owner_update" ON storage.objects;
CREATE POLICY "task_banners_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'task-banners' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'task-banners' AND owner = auth.uid());
