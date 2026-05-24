-- Add minimum task publish amount setting
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS minimum_task_publish_amount numeric NOT NULL DEFAULT 0;