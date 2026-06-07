// Google AdSense placement registry. Admin controls which slots are enabled
// and the AdSense slot id (data-ad-slot) for each placement.

export type AdPlacement =
  | "app_top"
  | "app_bottom"
  | "tasks_inline"
  | "wallet_top"
  | "landing_mid";

export type AdSlotConfig = { enabled: boolean; slot: string };

export type AdsConfig = {
  enabled: boolean;
  client: string; // ca-pub-XXXXXXXXXXXXXXXX
  slots: Partial<Record<AdPlacement, AdSlotConfig>>;
};

export const AD_PLACEMENTS: { id: AdPlacement; label: string; hint: string }[] = [
  { id: "app_top", label: "App — top banner", hint: "Shown at the top of every user app page (above content)." },
  { id: "app_bottom", label: "App — bottom banner", hint: "Shown at the bottom of every user app page." },
  { id: "tasks_inline", label: "Tasks page — inline", hint: "Single ad inside the Browse Tasks grid." },
  { id: "wallet_top", label: "Wallet page — top", hint: "Top of the Wallet page only." },
  { id: "landing_mid", label: "Landing — mid section", hint: "Shown to logged-out visitors on the homepage." },
];

export function emptyAdsConfig(): AdsConfig {
  return { enabled: false, client: "", slots: {} };
}

export function parseAdsConfig(row: any): AdsConfig {
  return {
    enabled: !!row?.ads_enabled,
    client: typeof row?.ads_client === "string" ? row.ads_client : "",
    slots: (row?.ads_slots ?? {}) as AdsConfig["slots"],
  };
}
