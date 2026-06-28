
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS auto_approve boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.auto_approve_submission_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_auto boolean;
BEGIN
  SELECT coalesce(auto_approve, false) INTO v_auto FROM public.tasks WHERE id = NEW.task_id;
  IF v_auto AND (NEW.status IS NULL OR NEW.status = 'pending') THEN
    NEW.status := 'approved';
    NEW.note := coalesce(NEW.note, 'Auto-approved by publisher settings');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_approve_submission_before_insert ON public.task_submissions;
CREATE TRIGGER trg_auto_approve_submission_before_insert
BEFORE INSERT ON public.task_submissions
FOR EACH ROW EXECUTE FUNCTION public.auto_approve_submission_on_insert();

CREATE OR REPLACE FUNCTION public.credit_auto_approved_submission_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_task record; v_new_completed int; v_new_status text;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  IF v_task IS NULL THEN RETURN NEW; END IF;

  UPDATE public.profiles
    SET balance = coalesce(balance, 0) + coalesce(v_task.reward, 0), updated_at = now()
    WHERE user_id = NEW.user_id;

  IF NOT EXISTS (SELECT 1 FROM public.payments WHERE user_id = NEW.user_id AND type = 'task_earning' AND reference = NEW.id::text) THEN
    INSERT INTO public.payments (user_id, type, amount, status, reference)
    VALUES (NEW.user_id, 'task_earning', coalesce(v_task.reward, 0), 'approved', NEW.id::text);
  END IF;

  v_new_completed := coalesce(v_task.completed_slots, 0) + 1;
  v_new_status := CASE WHEN v_new_completed >= coalesce(v_task.total_slots, 0) THEN 'completed' ELSE 'active' END;
  UPDATE public.tasks SET completed_slots = v_new_completed, status = v_new_status WHERE id = v_task.id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.user_id, 'Submission auto-approved',
    'You earned ৳' || coalesce(v_task.reward, 0)::text || ' (auto-approved instantly)',
    'submission_approved');

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_credit_auto_approved_submission ON public.task_submissions;
CREATE TRIGGER trg_credit_auto_approved_submission
AFTER INSERT ON public.task_submissions
FOR EACH ROW EXECUTE FUNCTION public.credit_auto_approved_submission_after_insert();
