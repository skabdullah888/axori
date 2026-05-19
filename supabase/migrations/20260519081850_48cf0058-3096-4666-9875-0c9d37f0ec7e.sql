create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  insert into public.profiles (user_id, username, email, phone, referral_code, referred_by)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    ref_code,
    ref_by
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (user_id, username, email, phone, referral_code)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'username', ''), split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data ->> 'phone',
  public.gen_referral_code()
from auth.users u
where not exists (
  select 1 from public.profiles p where p.user_id = u.id
);