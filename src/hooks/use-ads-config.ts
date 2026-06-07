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
        .select("ads_enabled, ads_provider, ads_client, ads_slots, ads_txt, ads_verification_meta, ads_head_script, ads_extra_scripts")
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setCfg(parseAdsConfig(data));
    };
    load();

    // Use a unique channel name per mount to avoid:
    // "tried to subscribe multiple times" / "cannot add callbacks after subscribe()"
    // when the hook is mounted from multiple components or under StrictMode.
    const channel = supabase
      .channel(`ads-config-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => {
          if (payload.new) setCfg(parseAdsConfig(payload.new));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return cfg;
}
