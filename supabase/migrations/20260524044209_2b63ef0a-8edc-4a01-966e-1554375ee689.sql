ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS withdrawals_enabled boolean NOT NULL DEFAULT true;