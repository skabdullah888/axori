
CREATE OR REPLACE FUNCTION public.on_submission_reviewed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE t_title text; t_reward numeric; pref boolean;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT title, reward INTO t_title, t_reward FROM public.tasks WHERE id = NEW.task_id;
  SELECT coalesce(notify_tasks, true) INTO pref FROM public.profiles WHERE user_id = NEW.user_id;
  IF pref IS DISTINCT FROM false THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.user_id, 'Submission approved',
        'You earned $' || coalesce(t_reward::text, '0') || ' for "' || coalesce(t_title, 'a task') || '"',
        'submission_approved');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.user_id, 'Submission rejected',
        'Your submission for "' || coalesce(t_title, 'a task') || '" was rejected',
        'submission_rejected');
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.on_payment_reviewed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE pref boolean;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.type NOT IN ('activation', 'deposit', 'withdrawal') THEN RETURN NEW; END IF;
  SELECT coalesce(notify_payments, true) INTO pref FROM public.profiles WHERE user_id = NEW.user_id;
  IF pref IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, initcap(NEW.type) || ' ' || NEW.status,
      'Your ' || NEW.type || ' of $' || NEW.amount::text || ' was ' || NEW.status,
      NEW.type || '_' || NEW.status);
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.on_submission_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE pub_id uuid; t_title text; uname text; pref boolean;
BEGIN
  SELECT publisher_id, title INTO pub_id, t_title FROM public.tasks WHERE id = NEW.task_id;
  SELECT username INTO uname FROM public.profiles WHERE user_id = NEW.user_id;
  IF pub_id IS NOT NULL AND pub_id <> NEW.user_id THEN
    SELECT coalesce(notify_tasks, true) INTO pref FROM public.profiles WHERE user_id = pub_id;
    IF pref IS DISTINCT FROM false THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (pub_id, 'New submission',
        coalesce(uname, 'A user') || ' submitted proof for "' || coalesce(t_title, 'your task') || '"',
        'submission_new');
    END IF;
  END IF;
  PERFORM public.notify_admins('New task submission',
    coalesce(uname, 'A user') || ' submitted to "' || coalesce(t_title, '?') || '"', 'submission_new');
  RETURN NEW;
END; $function$;
