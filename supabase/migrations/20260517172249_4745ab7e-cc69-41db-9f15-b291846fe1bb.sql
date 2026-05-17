
-- ============ PROFILES ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activation_request_at TIMESTAMPTZ;

-- self-policies
CREATE POLICY "users_select_own_profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ TASKS ============
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proof_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS proof_type TEXT DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS proof_examples JSONB DEFAULT '[]'::jsonb;

CREATE POLICY "anyone_auth_view_active_tasks" ON public.tasks
  FOR SELECT TO authenticated USING (status = 'active' OR status = 'completed' OR publisher_id = auth.uid());
CREATE POLICY "publisher_insert_own_tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (publisher_id = auth.uid());
CREATE POLICY "publisher_update_own_tasks" ON public.tasks
  FOR UPDATE TO authenticated USING (publisher_id = auth.uid());

-- ============ TASK SUBMISSIONS ============
ALTER TABLE public.task_submissions
  ADD COLUMN IF NOT EXISTS proof_text TEXT;

CREATE POLICY "user_select_own_submissions" ON public.task_submissions
  FOR SELECT TO authenticated USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.publisher_id = auth.uid()));
CREATE POLICY "user_insert_own_submissions" ON public.task_submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "publisher_update_submissions" ON public.task_submissions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.publisher_id = auth.uid())
  );

CREATE POLICY "user_select_own_proofs" ON public.task_submission_proofs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.task_submissions s
            WHERE s.id = submission_id
            AND (s.user_id = auth.uid()
                 OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = s.task_id AND t.publisher_id = auth.uid())))
  );
CREATE POLICY "user_insert_own_proofs" ON public.task_submission_proofs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.task_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid())
  );

-- ============ APPEALS ============
CREATE POLICY "user_select_own_appeals" ON public.appeals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_own_appeals" ON public.appeals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ PAYMENTS ============
CREATE POLICY "user_select_own_payments" ON public.payments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert_own_payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ NOTIFICATIONS ============
CREATE POLICY "user_select_own_notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============ REFERRAL EARNINGS ============
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_referral_earnings" ON public.referral_earnings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user_select_own_referrals" ON public.referral_earnings
  FOR SELECT TO authenticated USING (referrer_id = auth.uid());

-- ============ PAYMENT METHODS (admin-defined deposit info) ============
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  receiver_number TEXT NOT NULL,
  instructions TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_auth_view_payment_methods" ON public.payment_methods
  FOR SELECT TO authenticated USING (active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_manage_payment_methods" ON public.payment_methods
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ SETTINGS ============
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS referral_bonus NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS activation_amount NUMERIC NOT NULL DEFAULT 5;

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c TEXT;
BEGIN
  LOOP
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = c);
  END LOOP;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ref_code TEXT;
  ref_by UUID;
  meta_ref TEXT;
BEGIN
  ref_code := public.gen_referral_code();
  meta_ref := NEW.raw_user_meta_data ->> 'referral_code';
  IF meta_ref IS NOT NULL AND length(meta_ref) > 0 THEN
    SELECT user_id INTO ref_by FROM public.profiles WHERE referral_code = upper(meta_ref) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, username, email, phone, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone',
    ref_code,
    ref_by
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "proofs_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'proofs');
CREATE POLICY "proofs_auth_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Default settings row if missing
INSERT INTO public.settings (minimum_withdrawal, withdrawal_fee, activation_fee, publisher_task_tax, referral_bonus, activation_amount)
SELECT 10, 0, 0, 5, 1, 5
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- Default payment method
INSERT INTO public.payment_methods (name, receiver_number, instructions)
SELECT 'bKash', '01700000000', 'Send money to the number above and submit the transaction ID.'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods);
