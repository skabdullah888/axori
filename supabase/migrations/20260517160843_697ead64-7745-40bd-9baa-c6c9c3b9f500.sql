
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS sender_number text,
  ADD COLUMN IF NOT EXISTS receiver_number text,
  ADD COLUMN IF NOT EXISTS trnx_id text;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS publisher_task_tax numeric NOT NULL DEFAULT 0;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS admin_targeted boolean NOT NULL DEFAULT false;
