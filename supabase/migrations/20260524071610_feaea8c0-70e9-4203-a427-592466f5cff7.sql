
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.section_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.section_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_manage_section_videos ON public.section_videos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY authenticated_view_section_videos ON public.section_videos
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_section_videos_updated
  BEFORE UPDATE ON public.section_videos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.section_videos (section_key, title) VALUES
  ('tasks', 'How to browse & complete tasks'),
  ('submissions', 'How submissions work'),
  ('appeals', 'How to file an appeal'),
  ('wallet', 'How the wallet works'),
  ('deposit', 'How to deposit'),
  ('withdraw', 'How to withdraw'),
  ('publish', 'How to publish a task'),
  ('referrals', 'How referrals work')
ON CONFLICT (section_key) DO NOTHING;
