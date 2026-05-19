
-- Default new profiles to inactive
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'inactive';

-- Update handle_new_user to insert inactive status explicitly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  ref_code text;
  ref_by uuid;
  meta_ref text;
begin
  if exists (select 1 from public.profiles where user_id = new.id) then
    return new;
  end if;

  ref_code := public.gen_referral_code();
  meta_ref := new.raw_user_meta_data ->> 'referral_code';

  if meta_ref is not null and length(meta_ref) > 0 then
    select user_id into ref_by
    from public.profiles
    where referral_code = upper(meta_ref)
    limit 1;
  end if;

  insert into public.profiles (user_id, username, email, phone, referral_code, referred_by, status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    ref_code,
    ref_by,
    'inactive'
  );

  return new;
end;
$function$;

-- Block submissions from inactive users
CREATE OR REPLACE FUNCTION public.enforce_active_for_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  u_status text;
BEGIN
  SELECT status INTO u_status FROM public.profiles WHERE user_id = NEW.user_id;
  IF u_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Account must be active to submit tasks';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_active_submission ON public.task_submissions;
CREATE TRIGGER enforce_active_submission
  BEFORE INSERT ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_for_submission();
