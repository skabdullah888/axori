ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS withdrawals_hidden boolean NOT NULL DEFAULT false;