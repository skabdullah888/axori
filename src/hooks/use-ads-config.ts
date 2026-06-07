import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emptyAdsConfig, parseAdsConfig, type AdsConfig } from "@/lib/ads";

export function useAdsConfig(): AdsConfig {
  const [cfg, setCfg] = useState<AdsConfig>(emptyAdsConfig());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("settings")
        .select("ads_enabled, ads_client, ads_slots")
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setCfg(parseAdsConfig(data));
    };
    load();
    const ch = supabase
      .channel("ads-config")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => setCfg(parseAdsConfig(payload.new ?? {})),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  return cfg;
}
