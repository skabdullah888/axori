CREATE TABLE IF NOT EXISTS public.notice_board (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notice_board ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_view_active_notices" ON public.notice_board;
CREATE POLICY "authenticated_view_active_notices" ON public.notice_board
  FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_manage_notices" ON public.notice_board;
CREATE POLICY "admin_manage_notices" ON public.notice_board
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.notice_board_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS notice_board_updated_at ON public.notice_board;
CREATE TRIGGER notice_board_updated_at
  BEFORE UPDATE ON public.notice_board
  FOR EACH ROW EXECUTE FUNCTION public.notice_board_set_updated_at();

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notice_board';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.notice_board; END IF;
END $$;