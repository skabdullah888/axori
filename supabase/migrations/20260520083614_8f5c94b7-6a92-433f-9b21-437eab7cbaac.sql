CREATE POLICY "user_delete_own_notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());