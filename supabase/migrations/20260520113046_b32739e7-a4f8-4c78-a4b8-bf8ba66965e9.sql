CREATE OR REPLACE FUNCTION public.credit_approved_task_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task record;
  v_new_completed int;
  v_new_status text;
BEGIN
  IF NEW.status <> 'approved' OR OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  IF v_task IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET balance = coalesce(balance, 0) + coalesce(v_task.reward, 0),
      updated_at = now()
  WHERE user_id = NEW.user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.payments
    WHERE user_id = NEW.user_id
      AND type = 'task_earning'
      AND reference = NEW.id::text
  ) THEN
    INSERT INTO public.payments (user_id, type, amount, status, reference)
    VALUES (NEW.user_id, 'task_earning', coalesce(v_task.reward, 0), 'approved', NEW.id::text);
  END IF;

  v_new_completed := coalesce(v_task.completed_slots, 0) + 1;
  v_new_status := CASE WHEN v_new_completed >= coalesce(v_task.total_slots, 0) THEN 'completed' ELSE 'active' END;

  UPDATE public.tasks
  SET completed_slots = v_new_completed,
      status = v_new_status
  WHERE id = v_task.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_submission_approved_credit ON public.task_submissions;
CREATE TRIGGER task_submission_approved_credit
AFTER UPDATE OF status ON public.task_submissions
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
EXECUTE FUNCTION public.credit_approved_task_submission();

CREATE OR REPLACE FUNCTION public.publisher_review_submission(p_submission_id uuid, p_approve boolean, p_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub record;
  v_task record;
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
END;
$$;

GRANT EXECUTE ON FUNCTION public.publisher_review_submission(uuid, boolean, text) TO authenticated;