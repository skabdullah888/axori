
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS site_theme text NOT NULL DEFAULT 'default';

CREATE OR REPLACE FUNCTION public.get_site_theme()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(site_theme, 'default') FROM public.settings LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_site_theme() TO anon, authenticated;
