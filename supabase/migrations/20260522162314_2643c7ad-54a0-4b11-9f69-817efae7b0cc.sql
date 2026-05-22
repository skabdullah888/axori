
-- Allow submissions when activation_fee is 0
CREATE OR REPLACE FUNCTION public.enforce_active_for_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  u_status text;
  fee numeric;
BEGIN
  SELECT coalesce(activation_fee, activation_amount, 0) INTO fee FROM public.settings LIMIT 1;
  IF coalesce(fee, 0) <= 0 THEN
    RETURN NEW;
  END IF;
  SELECT status INTO u_status FROM public.profiles WHERE user_id = NEW.user_id;
  IF u_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Account must be active to submit tasks';
  END IF;
  RETURN NEW;
END;
$function$;

-- On signup, mark active if fee is 0
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
  base_username text;
  final_username text;
  suffix int := 0;
  final_phone text;
  fee numeric;
  initial_status text;
begin
  if exists (select 1 from public.profiles where user_id = new.id) then
    return new;
  end if;

  ref_code := public.gen_referral_code();
  meta_ref := new.raw_user_meta_data ->> 'referral_code';

  if meta_ref is not null and length(meta_ref) > 0 then
    select user_id into ref_by from public.profiles where referral_code = upper(meta_ref) limit 1;
  end if;

  base_username := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1));
  final_username := base_username;
  while exists (select 1 from public.profiles where lower(username) = lower(final_username)) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  final_phone := nullif(new.raw_user_meta_data ->> 'phone', '');
  if final_phone is not null and exists (select 1 from public.profiles where phone = final_phone) then
    final_phone := null;
  end if;

  select coalesce(activation_fee, activation_amount, 0) into fee from public.settings limit 1;
  if coalesce(fee, 0) <= 0 then
    initial_status := 'active';
  else
    initial_status := 'inactive';
  end if;

  insert into public.profiles (user_id, username, email, phone, referral_code, referred_by, status, activated_at)
  values (new.id, final_username, new.email, final_phone, ref_code, ref_by, initial_status,
          case when initial_status = 'active' then now() else null end);

  return new;
end;
$function$;

-- Auto-activate existing inactive users right now if fee is currently 0
DO $$
DECLARE fee numeric;
BEGIN
  SELECT coalesce(activation_fee, activation_amount, 0) INTO fee FROM public.settings LIMIT 1;
  IF coalesce(fee, 0) <= 0 THEN
    UPDATE public.profiles SET status = 'active', activated_at = coalesce(activated_at, now())
    WHERE status <> 'active';
  END IF;
END $$;

-- Trigger: whenever settings.activation_fee changes to 0, auto-activate all inactive users
CREATE OR REPLACE FUNCTION public.on_settings_fee_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE new_fee numeric;
BEGIN
  new_fee := coalesce(NEW.activation_fee, NEW.activation_amount, 0);
  IF coalesce(new_fee, 0) <= 0 THEN
    UPDATE public.profiles SET status = 'active', activated_at = coalesce(activated_at, now())
    WHERE status <> 'active';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_settings_fee_change ON public.settings;
CREATE TRIGGER trg_settings_fee_change
AFTER INSERT OR UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.on_settings_fee_change();
