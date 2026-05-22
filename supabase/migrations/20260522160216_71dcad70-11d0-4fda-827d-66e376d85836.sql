
CREATE OR REPLACE FUNCTION public.admin_reject_task_with_refund(p_task_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task record;
  v_hold numeric;
  v_already_refunded numeric;
  v_refund numeric;
  v_used_ratio numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF v_task.status IN ('rejected','completed') THEN
    RAISE EXCEPTION 'Task cannot be rejected in its current status';
  END IF;

  SELECT coalesce(sum(amount), 0) INTO v_hold
  FROM public.payments
  WHERE reference = p_task_id::text AND type = 'task_publish_hold' AND status = 'approved';

  SELECT coalesce(sum(amount), 0) INTO v_already_refunded
  FROM public.payments
  WHERE reference = p_task_id::text AND type = 'task_publish_refund';

  -- Refund only the unused slot portion
  IF coalesce(v_task.total_slots, 0) > 0 THEN
    v_used_ratio := coalesce(v_task.completed_slots, 0)::numeric / v_task.total_slots::numeric;
  ELSE
    v_used_ratio := 0;
  END IF;

  v_refund := (v_hold * (1 - v_used_ratio)) - v_already_refunded;

  UPDATE public.tasks SET status = 'rejected' WHERE id = p_task_id;

  IF v_refund > 0 AND v_task.publisher_id IS NOT NULL THEN
    UPDATE public.profiles
    SET balance = coalesce(balance, 0) + v_refund, updated_at = now()
    WHERE user_id = v_task.publisher_id;

    INSERT INTO public.payments (user_id, type, amount, status, reference)
    VALUES (v_task.publisher_id, 'task_publish_refund', v_refund, 'approved', p_task_id::text);
  END IF;
END;
$$;
