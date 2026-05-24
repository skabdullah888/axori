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
  RETURN NEW;
END; $function$;