-- 1) Realtime broadcast: restrict to admins or topics scoped to the user's own uid
DROP POLICY IF EXISTS "authenticated_can_receive_broadcast" ON realtime.messages;
CREATE POLICY "authenticated_topic_scoped_broadcast" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR realtime.topic() LIKE '%' || auth.uid()::text || '%'
  );

-- 2) Block direct UPDATE of withdrawal destination fields; require RPC + recent sign-in
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
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
  END IF;
  -- Block direct updates to withdrawal destination unless explicitly allowed via RPC
  IF (NEW.withdrawal_account IS DISTINCT FROM OLD.withdrawal_account
      OR NEW.withdrawal_method IS DISTINCT FROM OLD.withdrawal_method)
     AND coalesce(current_setting('app.allow_withdrawal_update', true), '') <> '1'
  THEN
    RAISE EXCEPTION 'Withdrawal destination can only be changed via set_withdrawal_destination after re-authentication';
  END IF;
  RETURN NEW;
END $function$;

-- 3) RPC: requires the user to have signed in (password) within the last 5 minutes
CREATE OR REPLACE FUNCTION public.set_withdrawal_destination(p_method text, p_account text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_last timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_method IS NULL OR length(trim(p_method)) = 0 THEN RAISE EXCEPTION 'Method required'; END IF;
  IF p_account IS NULL OR length(trim(p_account)) = 0 THEN RAISE EXCEPTION 'Account required'; END IF;

  SELECT last_sign_in_at INTO v_last FROM auth.users WHERE id = v_uid;
  IF v_last IS NULL OR v_last < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Please re-enter your password to update withdrawal destination';
  END IF;

  PERFORM set_config('app.allow_withdrawal_update', '1', true);
  UPDATE public.profiles
    SET withdrawal_method = p_method,
        withdrawal_account = trim(p_account),
        updated_at = now()
    WHERE user_id = v_uid;
  PERFORM set_config('app.allow_withdrawal_update', '', true);

  INSERT INTO public.security_logs (user_id, action, meta)
  VALUES (v_uid, 'withdrawal_destination_changed',
    jsonb_build_object('method', p_method, 'account_last4', right(trim(p_account), 4)));
END;
$function$;

REVOKE ALL ON FUNCTION public.set_withdrawal_destination(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_withdrawal_destination(text, text) TO authenticated;