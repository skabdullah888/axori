CREATE OR REPLACE FUNCTION public.on_payment_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uname text;
  recent_exists boolean;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  IF NEW.type NOT IN ('activation', 'deposit', 'withdrawal') THEN RETURN NEW; END IF;

  SELECT username INTO uname FROM public.profiles WHERE user_id = NEW.user_id;

  -- Skip if an admin notification for the same user + request type was already created within the last 24 hours
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE admin_targeted = true
      AND type = NEW.type || '_request'
      AND coalesce(uname, '') <> ''
      AND message ILIKE '%' || uname || '%'
      AND created_at > now() - interval '24 hours'
  ) INTO recent_exists;

  IF recent_exists THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_admins('New ' || NEW.type || ' request',
    coalesce(uname, 'A user') || ' submitted a ' || NEW.type || ' of $' || NEW.amount::text,
    NEW.type || '_request');
  RETURN NEW;
END; $function$;