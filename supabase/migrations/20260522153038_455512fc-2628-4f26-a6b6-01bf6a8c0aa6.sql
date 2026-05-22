
CREATE OR REPLACE FUNCTION public.publish_task_with_charge(
  p_title text, p_description text, p_instructions text, p_category text,
  p_reward numeric, p_total_slots integer,
  p_proof_type text, p_proof_count integer, p_proof_fields jsonb,
  p_banner_url text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tax numeric;
  v_subtotal numeric;
  v_total numeric;
  v_balance numeric;
  v_task_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reward <= 0 OR p_total_slots <= 0 THEN RAISE EXCEPTION 'Invalid reward or slots'; END IF;

  SELECT coalesce(publisher_task_tax, 0) INTO v_tax FROM public.settings LIMIT 1;
  v_subtotal := p_reward * p_total_slots;
  v_total := v_subtotal + (v_subtotal * coalesce(v_tax,0) / 100);

  SELECT coalesce(balance, 0) INTO v_balance FROM public.profiles WHERE user_id = v_uid FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_balance < v_total THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  INSERT INTO public.tasks (
    publisher_id, title, description, instructions, category,
    reward, total_slots, proof_type, proof_count, proof_fields, banner_url, status
  ) VALUES (
    v_uid, p_title, p_description, p_instructions, p_category,
    p_reward, p_total_slots, p_proof_type, p_proof_count, p_proof_fields, p_banner_url, 'pending'
  ) RETURNING id INTO v_task_id;

  UPDATE public.profiles
  SET balance = balance - v_total, is_publisher = true, updated_at = now()
  WHERE user_id = v_uid;

  INSERT INTO public.payments (user_id, type, amount, status, reference)
  VALUES (v_uid, 'task_publish_hold', v_total, 'approved', v_task_id::text);

  RETURN v_task_id;
END;
$$;

-- Allow the privilege-escalation guard to permit balance changes done by this SECURITY DEFINER fn
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  -- Allow when called from a SECURITY DEFINER function (session_user = postgres while auth.uid is the user)
  IF current_setting('role', true) = 'none' OR session_user = 'postgres' THEN
    -- still let through; SECURITY DEFINER fns run as table owner
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
  RETURN NEW;
END $$;
