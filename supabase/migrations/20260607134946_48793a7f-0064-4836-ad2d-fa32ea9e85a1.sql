ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS ads_txt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ads_verification_meta text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ads_head_script text NOT NULL DEFAULT '';