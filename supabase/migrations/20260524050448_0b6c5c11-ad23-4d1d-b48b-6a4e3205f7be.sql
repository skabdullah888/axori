
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_ip text;
CREATE INDEX IF NOT EXISTS idx_profiles_signup_ip ON public.profiles(signup_ip) WHERE signup_ip IS NOT NULL;

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS duplicate_ip_warning_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS duplicate_ip_warning_message text NOT NULL DEFAULT 'We detected that another account was created from the same IP address as yours. Creating multiple accounts violates our terms and may result in suspension.';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS duplicate_ip_warning_title text NOT NULL DEFAULT 'Account warning: duplicate IP detected';

-- Update handle_new_user to capture signup_ip from metadata and trigger duplicate IP warning
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
  meta_ip text;
  dup_count int;
  dup_enabled boolean;
  dup_title text;
  dup_msg text;
  uname text;
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

  insert into public.profiles (user_id, username, email, phone, referral_code, referred_by, status, activated_at, signup_ip)
  values (new.id, final_username, new.email, final_phone, ref_code, ref_by, initial_status,
          case when initial_status = 'active' then now() else null end, meta_ip);

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
