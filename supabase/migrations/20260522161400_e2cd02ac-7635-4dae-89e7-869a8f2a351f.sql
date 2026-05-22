
CREATE OR REPLACE FUNCTION public.publisher_cancel_task(p_task_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_task record;
  v_hold numeric;
  v_already_refunded numeric;
  v_refund numeric := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF v_task.publisher_id <> v_uid AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_task.status IN ('completed','rejected','cancelled') THEN
    RAISE EXCEPTION 'Task cannot be cancelled in its current status';
  END IF;

  SELECT coalesce(sum(amount), 0) INTO v_hold
  FROM public.payments
  WHERE reference = p_task_id::text AND type = 'task_publish_hold' AND status = 'approved';

  SELECT coalesce(sum(amount), 0) INTO v_already_refunded
  FROM public.payments
  WHERE reference = p_task_id::text AND type = 'task_publish_refund';

  -- Only refund when task is still pending (never been active)
  IF v_task.status = 'pending' THEN
    v_refund := v_hold - v_already_refunded;
  ELSE
    v_refund := 0;
  END IF;

  UPDATE public.tasks SET status = 'cancelled' WHERE id = p_task_id;

  IF v_refund > 0 THEN
    UPDATE public.profiles
    SET balance = coalesce(balance, 0) + v_refund, updated_at = now()
    WHERE user_id = v_task.publisher_id;

    INSERT INTO public.payments (user_id, type, amount, status, reference)
    VALUES (v_task.publisher_id, 'task_publish_refund', v_refund, 'approved', p_task_id::text);
  END IF;

  RETURN jsonb_build_object('refunded', v_refund, 'status', 'cancelled');
END;
$$;
