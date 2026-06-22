
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS signup_bonus_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signup_bonus_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signup_bonus_max_users integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signup_bonus_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS signup_bonus_granted_count integer NOT NULL DEFAULT 0;

-- Replace handle_new_user to also grant signup bonus when configured
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  meta_ip text;
  dup_count int;
  dup_enabled boolean;
  dup_title text;
  dup_msg text;
  uname text;
  bonus_enabled boolean;
  bonus_amount numeric;
  bonus_max int;
  bonus_start timestamptz;
  bonus_granted int;
  bonus_to_credit numeric := 0;
  initial_balance numeric := 0;
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

  meta_ip := nullif(new.raw_user_meta_data ->> 'signup_ip', '');

  select coalesce(activation_fee, activation_amount, 0) into fee from public.settings limit 1;
  if coalesce(fee, 0) <= 0 then
    initial_status := 'active';
  else
    initial_status := 'inactive';
  end if;

  -- Signup bonus eligibility (atomic claim against settings row)
  SELECT coalesce(signup_bonus_enabled,false), coalesce(signup_bonus_amount,0),
         coalesce(signup_bonus_max_users,0), signup_bonus_start_at,
         coalesce(signup_bonus_granted_count,0)
    INTO bonus_enabled, bonus_amount, bonus_max, bonus_start, bonus_granted
    FROM public.settings LIMIT 1 FOR UPDATE;

  IF bonus_enabled AND bonus_amount > 0 AND bonus_max > 0
     AND (bonus_start IS NULL OR now() >= bonus_start)
     AND bonus_granted < bonus_max
  THEN
    bonus_to_credit := bonus_amount;
    initial_balance := bonus_amount;
    UPDATE public.settings SET signup_bonus_granted_count = bonus_granted + 1;
  END IF;

  insert into public.profiles (user_id, username, email, phone, referral_code, referred_by, status, activated_at, signup_ip, balance)
  values (new.id, final_username, new.email, final_phone, ref_code, ref_by, initial_status,
          case when initial_status = 'active' then now() else null end, meta_ip, initial_balance);

  IF bonus_to_credit > 0 THEN
    INSERT INTO public.payments (user_id, type, amount, status, reference)
    VALUES (new.id, 'signup_bonus', bonus_to_credit, 'approved', 'signup_bonus');

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (new.id, 'Welcome bonus credited',
            'You received ৳' || bonus_to_credit::text || ' signup bonus. Enjoy!',
            'signup_bonus');
  END IF;

  -- Duplicate IP detection
  if meta_ip is not null then
    select count(*) into dup_count from public.profiles where signup_ip = meta_ip and user_id <> new.id;
    if dup_count > 0 then
      select coalesce(duplicate_ip_warning_enabled, true),
             coalesce(duplicate_ip_warning_title, 'Account warning: duplicate IP detected'),
             coalesce(duplicate_ip_warning_message, '')
        into dup_enabled, dup_title, dup_msg
      from public.settings limit 1;

      if coalesce(dup_enabled, true) and length(coalesce(dup_msg, '')) > 0 then
        insert into public.notifications (user_id, title, message, type)
        values (new.id, dup_title, dup_msg, 'warning');
      end if;

      uname := final_username;
      perform public.notify_admins(
        'Duplicate signup IP detected',
        coalesce(uname, 'A new user') || ' signed up from an IP used by ' || dup_count::text || ' other account(s) (' || meta_ip || ')',
        'duplicate_ip'
      );
    end if;
  end if;

  return new;
end;
$function$;
