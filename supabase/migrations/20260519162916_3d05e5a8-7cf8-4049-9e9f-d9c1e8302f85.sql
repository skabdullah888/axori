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

  base_username := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1));
  final_username := base_username;
  while exists (select 1 from public.profiles where lower(username) = lower(final_username)) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (user_id, username, email, phone, referral_code, referred_by, status)
  values (
    new.id,
    final_username,
    new.email,
    new.raw_user_meta_data ->> 'phone',
    ref_code,
    ref_by,
    'inactive'
  );

  return new;
end;
$function$;