import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSiteTheme, type SiteTheme } from "@/lib/site-themes";

export function useSiteTheme(): SiteTheme {
  const [themeId, setThemeId] = useState<string>("default");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase.rpc("get_site_theme");
      if (!cancelled && typeof data === "string") setThemeId(data);
    };
    load();

    const ch = supabase
      .channel("site-theme")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => {
          const next = (payload.new as { site_theme?: string } | null)?.site_theme;
          if (next) setThemeId(next);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  return getSiteTheme(themeId);
}
