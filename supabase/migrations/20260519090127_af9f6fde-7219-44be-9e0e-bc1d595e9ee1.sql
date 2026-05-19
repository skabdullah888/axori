
-- Remap any rows that currently store profiles.id instead of auth user id
UPDATE public.tasks t
SET publisher_id = p.user_id
FROM public.profiles p
WHERE t.publisher_id = p.id AND t.publisher_id IS DISTINCT FROM p.user_id;

UPDATE public.task_submissions s
SET user_id = p.user_id
FROM public.profiles p
WHERE s.user_id = p.id AND s.user_id IS DISTINCT FROM p.user_id;

UPDATE public.appeals a
SET user_id = p.user_id
FROM public.profiles p
WHERE a.user_id = p.id AND a.user_id IS DISTINCT FROM p.user_id;

-- Null out any tasks whose publisher cannot be resolved to a real auth user
UPDATE public.tasks SET publisher_id = NULL
WHERE publisher_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = publisher_id);

-- Delete orphan submissions/appeals (no valid auth user)
DELETE FROM public.task_submissions
WHERE user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = user_id);

DELETE FROM public.appeals
WHERE user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = user_id);

-- Now safe to re-point FKs to auth.users
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_publisher_id_fkey;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_publisher_id_fkey
  FOREIGN KEY (publisher_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.task_submissions DROP CONSTRAINT IF EXISTS task_submissions_user_id_fkey;
ALTER TABLE public.task_submissions
  ADD CONSTRAINT task_submissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.appeals DROP CONSTRAINT IF EXISTS appeals_user_id_fkey;
ALTER TABLE public.appeals
  ADD CONSTRAINT appeals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- New columns on tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS proof_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Storage bucket for banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-banners', 'task-banners', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view task banners" ON storage.objects;
CREATE POLICY "Anyone can view task banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-banners');

DROP POLICY IF EXISTS "Authenticated can upload task banners" ON storage.objects;
CREATE POLICY "Authenticated can upload task banners"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own task banners" ON storage.objects;
CREATE POLICY "Users can delete their own task banners"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Prevent self-submission
CREATE OR REPLACE FUNCTION public.prevent_self_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pub uuid;
BEGIN
  SELECT publisher_id INTO pub FROM public.tasks WHERE id = NEW.task_id;
  IF pub = NEW.user_id THEN
    RAISE EXCEPTION 'You cannot submit to your own task';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_submission ON public.task_submissions;
CREATE TRIGGER trg_prevent_self_submission
  BEFORE INSERT ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_submission();

-- Re-attach existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_enforce_active_for_submission ON public.task_submissions;
CREATE TRIGGER trg_enforce_active_for_submission
  BEFORE INSERT ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_for_submission();
