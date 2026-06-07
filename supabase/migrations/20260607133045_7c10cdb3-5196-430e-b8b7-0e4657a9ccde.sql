ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS ads_provider text NOT NULL DEFAULT 'adsense';