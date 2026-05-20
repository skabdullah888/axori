
-- 1) Block duplicate payment requests within 24 hours
CREATE OR REPLACE FUNCTION public.prevent_duplicate_payment_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE recent_exists boolean;
BEGIN
  IF NEW.type NOT IN ('activation','deposit','withdrawal') THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.payments
    WHERE user_id = NEW.user_id
      AND type = NEW.type
      AND created_at > now() - interval '24 hours'
  ) INTO recent_exists;

  IF recent_exists THEN
    RAISE EXCEPTION 'You have already submitted a % request in the last 24 hours. Please try again later.', NEW.type
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_payment_requests ON public.payments;
CREATE TRIGGER trg_prevent_duplicate_payment_requests
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_payment_requests();

-- 2) Strengthen admin-notification dedup: also check against payments table directly,
--    so that even if an old admin notification was deleted (after approve/reject),
--    a new request within 24h won't create another admin notification.
CREATE OR REPLACE FUNCTION public.on_payment_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
  recent_payment boolean;
  recent_notif boolean;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  IF NEW.type NOT IN ('activation','deposit','withdrawal') THEN RETURN NEW; END IF;

  SELECT username INTO uname FROM public.profiles WHERE user_id = NEW.user_id;

  SELECT EXISTS (
    SELECT 1 FROM public.payments
    WHERE user_id = NEW.user_id
      AND type = NEW.type
      AND id <> NEW.id
      AND created_at > now() - interval '24 hours'
  ) INTO recent_payment;

  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE admin_targeted = true
      AND type = NEW.type || '_request'
      AND coalesce(uname,'') <> ''
      AND message ILIKE '%' || uname || '%'
      AND created_at > now() - interval '24 hours'
  ) INTO recent_notif;

  IF recent_payment OR recent_notif THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_admins('New ' || NEW.type || ' request',
    coalesce(uname,'A user') || ' submitted a ' || NEW.type || ' of $' || NEW.amount::text,
    NEW.type || '_request');
  RETURN NEW;
END;
$$;
