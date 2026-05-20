
CREATE OR REPLACE FUNCTION public.publisher_review_submission(
  p_submission_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_task record;
  v_new_completed int;
  v_new_status text;
BEGIN
  SELECT * INTO v_sub FROM public.task_submissions WHERE id = p_submission_id;
  IF v_sub IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF v_sub.status <> 'pending' THEN RAISE EXCEPTION 'Submission already reviewed'; END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = v_sub.task_id;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;

  IF v_task.publisher_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to review this submission';
  END IF;

  UPDATE public.task_submissions
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      note = CASE WHEN p_approve THEN NULL ELSE p_reason END,
      updated_at = now()
  WHERE id = p_submission_id;

  IF p_approve THEN
    UPDATE public.profiles
    SET balance = balance + coalesce(v_task.reward, 0)
    WHERE user_id = v_sub.user_id;

    v_new_completed := coalesce(v_task.completed_slots, 0) + 1;
    v_new_status := CASE WHEN v_new_completed >= coalesce(v_task.total_slots, 0) THEN 'completed' ELSE 'active' END;
    UPDATE public.tasks
    SET completed_slots = v_new_completed, status = v_new_status
    WHERE id = v_task.id;

    INSERT INTO public.payments (user_id, type, amount, status, reference)
    VALUES (v_sub.user_id, 'task_earning', coalesce(v_task.reward, 0), 'approved', v_task.id::text);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publisher_review_submission(uuid, boolean, text) TO authenticated;
