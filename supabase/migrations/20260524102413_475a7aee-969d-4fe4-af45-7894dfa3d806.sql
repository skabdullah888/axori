
CREATE OR REPLACE FUNCTION public.auto_approve_stale_submissions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_task record;
  v_new_completed int;
  v_new_status text;
  v_count int := 0;
BEGIN
  FOR v_sub IN
    SELECT s.*
    FROM public.task_submissions s
    WHERE s.status = 'pending'
      AND s.created_at < now() - interval '24 hours'
    ORDER BY s.created_at ASC
    LIMIT 500
  LOOP
    SELECT * INTO v_task FROM public.tasks WHERE id = v_sub.task_id;
    IF v_task IS NULL THEN CONTINUE; END IF;

    UPDATE public.task_submissions
    SET status = 'approved',
        note = 'Auto-approved: publisher did not review within 24 hours',
        updated_at = now()
    WHERE id = v_sub.id;

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

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_sub.user_id,
      'Submission auto-approved',
      'Publisher did not review within 24 hours. You earned ৳' || coalesce(v_task.reward, 0)::text,
      'submission_approved'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_approve_stale_submissions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_approve_stale_submissions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_approve_stale_submissions() FROM authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'auto-approve-stale-submissions';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'auto-approve-stale-submissions',
  '*/15 * * * *',
  $cron$ SELECT public.auto_approve_stale_submissions(); $cron$
);
