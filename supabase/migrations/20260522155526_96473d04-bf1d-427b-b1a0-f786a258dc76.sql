
CREATE OR REPLACE FUNCTION public.admin_reject_task_with_refund(p_task_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task record;
  v_hold numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;
  IF v_task.status = 'rejected' THEN RAISE EXCEPTION 'Task already rejected'; END IF;

  -- Find the original hold amount from payments
  SELECT coalesce(sum(amount), 0) INTO v_hold
  FROM public.payments
  WHERE reference = p_task_id::text
    AND type = 'task_publish_hold'
    AND status = 'approved';

  -- Subtract any already-refunded amount (idempotency)
  v_hold := v_hold - coalesce((
    SELECT sum(amount) FROM public.payments
    WHERE reference = p_task_id::text AND type = 'task_publish_refund'
  ), 0);

  UPDATE public.tasks SET status = 'rejected' WHERE id = p_task_id;

  IF v_hold > 0 AND v_task.publisher_id IS NOT NULL THEN
    UPDATE public.profiles
    SET balance = coalesce(balance, 0) + v_hold, updated_at = now()
    WHERE user_id = v_task.publisher_id;

    INSERT INTO public.payments (user_id, type, amount, status, reference)
    VALUES (v_task.publisher_id, 'task_publish_refund', v_hold, 'approved', p_task_id::text);
  END IF;
END;
$$;
