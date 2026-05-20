
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS notify_tasks boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_payments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_appeals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS withdrawal_method text,
  ADD COLUMN IF NOT EXISTS withdrawal_account text;

DO $$ BEGIN
  CREATE POLICY "avatars_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_user_insert_own" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_user_update_own" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_user_delete_own" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
