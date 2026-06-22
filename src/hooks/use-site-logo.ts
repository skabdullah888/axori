import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_SITE_LOGO = "/favicon.png";

let cached: string | null | undefined;
const subscribers = new Set<(v: string | null) => void>();

async function loadOnce() {
  if (cached !== undefined) return;
  const { data } = await supabase.from("settings").select("site_logo_url").limit(1).maybeSingle();
  const raw = ((data as any)?.site_logo_url as string | null) ?? null;
  cached = raw && raw.trim().length > 0 ? raw : DEFAULT_SITE_LOGO;
  subscribers.forEach((cb) => cb(cached ?? null));
}

export function useSiteLogo(): string {
  const [logo, setLogo] = useState<string>(cached ?? DEFAULT_SITE_LOGO);
  useEffect(() => {
    subscribers.add((v) => setLogo(v ?? DEFAULT_SITE_LOGO));
    loadOnce();
    return () => { subscribers.delete(setLogo as any); };
  }, []);
  return logo;
}

