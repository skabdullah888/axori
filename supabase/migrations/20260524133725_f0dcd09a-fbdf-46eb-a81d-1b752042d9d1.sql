
-- 1) Server-side withdrawal amount validation
CREATE OR REPLACE FUNCTION public.validate_withdrawal_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_balance numeric;
BEGIN
  IF NEW.type = 'withdrawal' THEN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Withdrawal amount must be positive';
    END IF;
    SELECT coalesce(balance, 0) INTO v_balance
      FROM public.profiles WHERE user_id = NEW.user_id;
    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'Profile not found';
    END IF;
    IF NEW.amount > v_balance THEN
      RAISE EXCEPTION 'Withdrawal amount (%) exceeds available balance (%)', NEW.amount, v_balance;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_withdrawal_amount ON public.payments;
CREATE TRIGGER trg_validate_withdrawal_amount
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal_amount();

-- 2) Publisher status/restriction enforcement inside SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.publish_task_with_charge(
  p_title text, p_description text, p_instructions text, p_category text,
  p_reward numeric, p_total_slots integer, p_proof_type text,
  p_proof_count integer, p_proof_fields jsonb, p_banner_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tax numeric;
  v_min_total numeric;
  v_subtotal numeric;
  v_total numeric;
  v_balance numeric;
  v_task_id uuid;
  v_status text;
  v_restricted boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_reward <= 0 OR p_total_slots <= 0 THEN RAISE EXCEPTION 'Invalid reward or slots'; END IF;

  SELECT status, coalesce(publisher_restricted, false)
    INTO v_status, v_restricted
    FROM public.profiles WHERE user_id = v_uid;
  IF v_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Account must be active to publish tasks';
  END IF;
  IF v_restricted THEN
    RAISE EXCEPTION 'Publisher access is restricted for this account';
  END IF;

  SELECT coalesce(publisher_task_tax, 0), coalesce(minimum_task_total_amount, 0)
    INTO v_tax, v_min_total FROM public.settings LIMIT 1;

  v_subtotal := p_reward * p_total_slots;

  IF v_min_total > 0 AND v_subtotal < v_min_total THEN
    RAISE EXCEPTION 'Task total (reward × slots) must be at least %', v_min_total;
  END IF;

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
