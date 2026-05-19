-- Attach trigger so handle_new_user runs on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing users
INSERT INTO public.profiles (user_id, username, email, referral_code)
SELECT u.id,
       COALESCE(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1)),
       u.email,
       public.gen_referral_code()
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;