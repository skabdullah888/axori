// Ad placement registry. Admin chooses the active provider (AdSense, Adsterra,
// or Monetag) and configures the credentials/snippets per placement.
//
// Provider model:
//   - "adsense"  → uses publisher ID (ads_client) + per-placement slot ID
//   - "adsterra" → per-placement raw HTML/script snippet (their dashboard
//                  gives a <script>...</script> block per ad unit)
//   - "monetag"  → per-placement raw HTML/script snippet (same idea)

export type AdProvider = "adsense" | "adsterra" | "monetag";

export type AdPlacement =
  | "app_top"
  | "app_bottom"
  | "tasks_inline"
  | "wallet_top"
  | "landing_mid";

export type AdSlotConfig = {
  enabled: boolean;
  slot: string; // AdSense slot id (data-ad-slot)
  code: string; // raw HTML/script snippet for Adsterra / Monetag
};

export type AdsConfig = {
  enabled: boolean;
  provider: AdProvider;
  client: string; // AdSense publisher id (ca-pub-XXXX)
  slots: Partial<Record<AdPlacement, AdSlotConfig>>;
  /** Raw contents to serve at /ads.txt (AdSense ads.txt snippet). */
  adsTxt: string;
  /** google-site-verification meta tag (full tag or just the content value). */
  verificationMeta: string;
  /** Arbitrary <script>/HTML to inject into <head> on every page (AdSense code snippet, etc). */
  headScript: string;
};

export const AD_PLACEMENTS: { id: AdPlacement; label: string; hint: string }[] = [
  { id: "app_top", label: "App — top banner", hint: "Top of every user app page." },
  { id: "app_bottom", label: "App — bottom banner", hint: "Bottom of every user app page." },
  { id: "tasks_inline", label: "Tasks page — inline", hint: "Inside the Browse Tasks grid." },
  { id: "wallet_top", label: "Wallet page — top", hint: "Top of the Wallet page." },
  { id: "landing_mid", label: "Landing — mid section", hint: "Public homepage, between sections." },
];

export const AD_PROVIDERS: { id: AdProvider; label: string; help: string }[] = [
  {
    id: "adsense",
    label: "Google AdSense",
    help: "Use your AdSense Publisher ID + per-placement Ad slot ID.",
  },
  {
    id: "adsterra",
    label: "Adsterra",
    help: "Paste the <script> snippet Adsterra gives you per ad unit.",
  },
  {
    id: "monetag",
    label: "Monetag",
    help: "Paste the <script> snippet Monetag gives you per ad zone.",
  },
];

export function emptyAdsConfig(): AdsConfig {
  return { enabled: false, provider: "adsense", client: "", slots: {}, adsTxt: "", verificationMeta: "", headScript: "" };
}

export function parseAdsConfig(row: any): AdsConfig {
  const provider = (row?.ads_provider as AdProvider) ?? "adsense";
  return {
    enabled: !!row?.ads_enabled,
    provider: (["adsense", "adsterra", "monetag"] as const).includes(provider) ? provider : "adsense",
    client: typeof row?.ads_client === "string" ? row.ads_client : "",
    slots: (row?.ads_slots ?? {}) as AdsConfig["slots"],
    adsTxt: typeof row?.ads_txt === "string" ? row.ads_txt : "",
    verificationMeta: typeof row?.ads_verification_meta === "string" ? row.ads_verification_meta : "",
    headScript: typeof row?.ads_head_script === "string" ? row.ads_head_script : "",
  };
}

export function isPlacementActive(cfg: AdsConfig, placement: AdPlacement): boolean {
  if (!cfg.enabled) return false;
  const s = cfg.slots[placement];
  if (!s?.enabled) return false;
  if (cfg.provider === "adsense") return !!cfg.client && !!s.slot;
  return !!s.code && s.code.trim().length > 0;
}
