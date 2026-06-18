import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: string | null | undefined;
const subscribers = new Set<(v: string | null) => void>();

async function loadOnce() {
  if (cached !== undefined) return;
  const { data } = await supabase.from("settings").select("site_logo_url").limit(1).maybeSingle();
  cached = ((data as any)?.site_logo_url as string | null) ?? null;
  subscribers.forEach((cb) => cb(cached ?? null));
}

export function useSiteLogo(): string | null {
  const [logo, setLogo] = useState<string | null>(cached ?? null);
  useEffect(() => {
    subscribers.add(setLogo);
    loadOnce();
    return () => { subscribers.delete(setLogo); };
  }, []);
  return logo;
}
