
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_streak int NOT NULL DEFAULT 0;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS daily_checkin_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_checkin_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_checkin_streak_days int NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS daily_checkin_streak_bonus numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.claim_daily_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_enabled boolean;
  v_amount numeric;
  v_streak_days int;
  v_streak_bonus numeric;
  v_last timestamptz;
  v_streak int;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_last_date date;
  v_new_streak int;
  v_bonus_awarded numeric := 0;
  v_total numeric;
  v_streak_reset boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT coalesce(daily_checkin_enabled,false), coalesce(daily_checkin_amount,0),
         coalesce(daily_checkin_streak_days,7), coalesce(daily_checkin_streak_bonus,0)
    INTO v_enabled, v_amount, v_streak_days, v_streak_bonus
    FROM public.settings LIMIT 1;

  IF NOT v_enabled OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Daily check-in is disabled';
  END IF;

  SELECT last_checkin_at, coalesce(checkin_streak,0)
    INTO v_last, v_streak
    FROM public.profiles WHERE user_id = v_uid FOR UPDATE;

  v_last_date := CASE WHEN v_last IS NULL THEN NULL ELSE (v_last AT TIME ZONE 'UTC')::date END;

  IF v_last_date IS NOT NULL AND v_last_date = v_today THEN
    RAISE EXCEPTION 'You have already claimed today. Come back tomorrow!';
  END IF;

  IF v_last_date IS NOT NULL AND v_last_date = v_today - 1 THEN
    v_new_streak := v_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_total := v_amount;

  IF v_streak_days > 0 AND v_streak_bonus > 0 AND v_new_streak >= v_streak_days THEN
    v_bonus_awarded := v_streak_bonus;
    v_total := v_total + v_streak_bonus;
    v_new_streak := 0; -- reset cycle after bonus
    v_streak_reset := true;
  END IF;

  UPDATE public.profiles
    SET balance = coalesce(balance,0) + v_total,
        last_checkin_at = now(),
        checkin_streak = v_new_streak,
        updated_at = now()
    WHERE user_id = v_uid;

  INSERT INTO public.payments (user_id, type, amount, status, reference)
  VALUES (v_uid, 'daily_checkin', v_total, 'approved', 'checkin_' || v_today::text);

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_uid,
    CASE WHEN v_bonus_awarded > 0 THEN 'Streak bonus unlocked!' ELSE 'Daily check-in claimed' END,
    'You received ৳' || v_total::text ||
      CASE WHEN v_bonus_awarded > 0 THEN ' (includes ৳' || v_bonus_awarded::text || ' streak bonus!)' ELSE '' END,
    'daily_checkin');

  RETURN jsonb_build_object(
    'credited', v_total,
    'base', v_amount,
    'bonus', v_bonus_awarded,
    'streak', v_new_streak,
    'streak_reset', v_streak_reset
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO authenticated;
