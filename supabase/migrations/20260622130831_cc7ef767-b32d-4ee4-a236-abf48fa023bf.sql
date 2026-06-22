ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS referral_bonus_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS referral_bonus_percent numeric NOT NULL DEFAULT 0;

ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_referral_bonus_type_check;
ALTER TABLE public.settings
  ADD CONSTRAINT settings_referral_bonus_type_check
  CHECK (referral_bonus_type IN ('fixed','percent'));