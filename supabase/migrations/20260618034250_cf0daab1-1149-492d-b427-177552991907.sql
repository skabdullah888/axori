ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS social_facebook text,
  ADD COLUMN IF NOT EXISTS social_youtube text,
  ADD COLUMN IF NOT EXISTS social_instagram text,
  ADD COLUMN IF NOT EXISTS social_twitter text,
  ADD COLUMN IF NOT EXISTS social_telegram text,
  ADD COLUMN IF NOT EXISTS social_whatsapp text,
  ADD COLUMN IF NOT EXISTS social_tiktok text,
  ADD COLUMN IF NOT EXISTS social_linkedin text,
  ADD COLUMN IF NOT EXISTS contact_email text;

GRANT SELECT (social_facebook, social_youtube, social_instagram, social_twitter, social_telegram, social_whatsapp, social_tiktok, social_linkedin, contact_email) ON public.settings TO anon;