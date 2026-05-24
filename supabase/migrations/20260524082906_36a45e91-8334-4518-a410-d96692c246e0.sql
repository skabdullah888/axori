
DROP POLICY IF EXISTS user_delete_own_notifications ON public.notifications;
CREATE POLICY user_delete_own_notifications ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND admin_targeted = false);

DROP POLICY IF EXISTS user_update_own_notifications ON public.notifications;
CREATE POLICY user_update_own_notifications ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND admin_targeted = false)
  WITH CHECK (user_id = auth.uid() AND admin_targeted = false);

DROP POLICY IF EXISTS "authenticated_topic_scoped_broadcast" ON realtime.messages;
CREATE POLICY "authenticated_topic_scoped_broadcast" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR realtime.topic() = auth.uid()::text
    OR realtime.topic() LIKE '%-' || auth.uid()::text
  );
