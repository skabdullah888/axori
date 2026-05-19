
-- Clean orphan rows referencing missing profiles
DELETE FROM public.payments WHERE user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = payments.user_id);
DELETE FROM public.task_submissions WHERE user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = task_submissions.user_id);
DELETE FROM public.appeals WHERE user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = appeals.user_id);
UPDATE public.tasks SET publisher_id = NULL WHERE publisher_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = tasks.publisher_id);

-- FKs
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_publisher_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_publisher_id_fkey
  FOREIGN KEY (publisher_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.task_submissions DROP CONSTRAINT IF EXISTS task_submissions_task_id_fkey;
ALTER TABLE public.task_submissions ADD CONSTRAINT task_submissions_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_submissions DROP CONSTRAINT IF EXISTS task_submissions_user_id_fkey;
ALTER TABLE public.task_submissions ADD CONSTRAINT task_submissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.task_submission_proofs DROP CONSTRAINT IF EXISTS task_submission_proofs_submission_id_fkey;
ALTER TABLE public.task_submission_proofs ADD CONSTRAINT task_submission_proofs_submission_id_fkey
  FOREIGN KEY (submission_id) REFERENCES public.task_submissions(id) ON DELETE CASCADE;

ALTER TABLE public.appeals DROP CONSTRAINT IF EXISTS appeals_user_id_fkey;
ALTER TABLE public.appeals ADD CONSTRAINT appeals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.appeals DROP CONSTRAINT IF EXISTS appeals_submission_id_fkey;
ALTER TABLE public.appeals ADD CONSTRAINT appeals_submission_id_fkey
  FOREIGN KEY (submission_id) REFERENCES public.task_submissions(id) ON DELETE CASCADE;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Helper
CREATE OR REPLACE FUNCTION public.notify_admins(p_title text, p_message text, p_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, admin_targeted)
  SELECT ur.user_id, p_title, p_message, p_type, true
  FROM public.user_roles ur WHERE ur.role = 'admin';
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text) FROM public, anon, authenticated;

-- Task published → notify admins
CREATE OR REPLACE FUNCTION public.on_task_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname text;
BEGIN
  SELECT username INTO uname FROM public.profiles WHERE user_id = NEW.publisher_id;
  PERFORM public.notify_admins('New task published',
    coalesce(uname, 'A user') || ' published "' || NEW.title || '"', 'task_published');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_on_task_published ON public.tasks;
CREATE TRIGGER trg_on_task_published AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.on_task_published();

-- Submission created → notify publisher + admins
CREATE OR REPLACE FUNCTION public.on_submission_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pub_id uuid; t_title text; uname text;
BEGIN
  SELECT publisher_id, title INTO pub_id, t_title FROM public.tasks WHERE id = NEW.task_id;
  SELECT username INTO uname FROM public.profiles WHERE user_id = NEW.user_id;
  IF pub_id IS NOT NULL AND pub_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (pub_id, 'New submission',
      coalesce(uname, 'A user') || ' submitted proof for "' || coalesce(t_title, 'your task') || '"',
      'submission_new');
  END IF;
  PERFORM public.notify_admins('New task submission',
    coalesce(uname, 'A user') || ' submitted to "' || coalesce(t_title, '?') || '"', 'submission_new');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_on_submission_created ON public.task_submissions;
CREATE TRIGGER trg_on_submission_created AFTER INSERT ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_submission_created();

-- Submission reviewed → notify user
CREATE OR REPLACE FUNCTION public.on_submission_reviewed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t_title text; t_reward numeric;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT title, reward INTO t_title, t_reward FROM public.tasks WHERE id = NEW.task_id;
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
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_on_submission_reviewed ON public.task_submissions;
CREATE TRIGGER trg_on_submission_reviewed AFTER UPDATE ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_submission_reviewed();

-- Payment created → notify admins
CREATE OR REPLACE FUNCTION public.on_payment_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname text;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  IF NEW.type NOT IN ('activation', 'deposit', 'withdrawal') THEN RETURN NEW; END IF;
  SELECT username INTO uname FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM public.notify_admins('New ' || NEW.type || ' request',
    coalesce(uname, 'A user') || ' submitted a ' || NEW.type || ' of $' || NEW.amount::text,
    NEW.type || '_request');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_on_payment_created ON public.payments;
CREATE TRIGGER trg_on_payment_created AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.on_payment_created();

-- Payment reviewed → notify user
CREATE OR REPLACE FUNCTION public.on_payment_reviewed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.type NOT IN ('activation', 'deposit', 'withdrawal') THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (NEW.user_id, initcap(NEW.type) || ' ' || NEW.status,
    'Your ' || NEW.type || ' of $' || NEW.amount::text || ' was ' || NEW.status,
    NEW.type || '_' || NEW.status);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_on_payment_reviewed ON public.payments;
CREATE TRIGGER trg_on_payment_reviewed AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.on_payment_reviewed();

-- Profile status change by admin → notify user
CREATE OR REPLACE FUNCTION public.on_profile_status_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, 'Account ' || NEW.status,
      'Your account status was changed to ' || NEW.status || ' by an administrator.',
      'account_status_changed');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_on_profile_status_changed ON public.profiles;
CREATE TRIGGER trg_on_profile_status_changed AFTER UPDATE OF status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_profile_status_changed();

-- Realtime
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tasks';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='task_submissions';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.task_submissions; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='payments';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.payments; END IF;
END $$;
