CREATE POLICY "anon_view_settings" ON public.settings FOR SELECT TO anon USING (true);
GRANT SELECT ON public.settings TO anon;