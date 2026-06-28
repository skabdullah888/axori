
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user','admin')),
  sender_id UUID,
  message TEXT NOT NULL,
  read_by_admin BOOLEAN NOT NULL DEFAULT false,
  read_by_user BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own support messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users send own support messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    (sender = 'user' AND auth.uid() = user_id AND sender_id = auth.uid())
    OR (sender = 'admin' AND public.has_role(auth.uid(), 'admin') AND sender_id = auth.uid())
  );

CREATE POLICY "Mark read updates"
  ON public.support_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX support_messages_user_id_created_idx ON public.support_messages(user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.on_support_message_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uname text;
BEGIN
  IF NEW.sender = 'user' THEN
    SELECT username INTO uname FROM public.profiles WHERE user_id = NEW.user_id;
    PERFORM public.notify_admins('New support message',
      coalesce(uname,'A user') || ': ' || left(NEW.message, 120),
      'support_message');
  ELSIF NEW.sender = 'admin' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, 'Support reply', left(NEW.message, 200), 'support_reply');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_on_support_message_created
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.on_support_message_created();
