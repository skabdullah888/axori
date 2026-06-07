
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS ads_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ads_client text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ads_slots jsonb NOT NULL DEFAULT '{}'::jsonb;
