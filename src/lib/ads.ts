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

/** A sitewide ad unit's saved state (Popunder, Social Bar, etc). */
export type AdExtraScript = { enabled: boolean; code: string };

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
  /**
   * Sitewide / multi-format ad units keyed by `${provider}_${unitId}` (see
   * AD_EXTRA_CATALOG). Snippet is injected sitewide; URL-only entries
   * (smartlink / direct link) are stored but not auto-injected.
   */
  extraScripts: Record<string, AdExtraScript>;
};

export const AD_PLACEMENTS: { id: AdPlacement; label: string; hint: string }[] = [
  { id: "app_top", label: "App — top banner", hint: "Top of every user app page." },
  { id: "app_bottom", label: "App — bottom banner", hint: "Bottom of every user app page." },
  { id: "tasks_inline", label: "Tasks page — inline", hint: "Inside the Browse Tasks grid." },
  { id: "wallet_top", label: "Wallet page — top", hint: "Top of the Wallet page." },
  { id: "landing_mid", label: "Landing — mid section", hint: "Public homepage, between sections." },
];

/**
 * Per-placement guidance for Adsterra & Monetag — tells the admin exactly
 * which ad unit type/size to create in the provider dashboard and what to
 * paste into the "Ad code" textarea for this slot.
 */
export type AdRecommendation = {
  unit: string;
  size: string;
  paste: string;
  notes: string[];
};

export const AD_RECOMMENDATIONS: Record<AdProvider, Partial<Record<AdPlacement, AdRecommendation>>> = {
  adsense: {},
  adsterra: {
    app_top: {
      unit: "Banner 728×90 (leaderboard)",
      size: "728×90 (auto-shrinks on mobile)",
      paste: "Full <script> + container from Adsterra → Websites → axorabd.site → Banner 728x90 → GET CODE.",
      notes: [
        "Best for the very top of every app page.",
        "If you only have one banner unit, use this one — we center it and it scales down.",
      ],
    },
    app_bottom: {
      unit: "Banner 320×50 (mobile bottom bar)",
      size: "320×50 or 468×60",
      paste: "Code from Adsterra → Banner 320x50 → GET CODE.",
      notes: [
        "Most users are on mobile — 320×50 fits without pushing content.",
        "Do NOT paste Popunder / Social Bar / Smartlink here — those are sitewide and belong in Method 1 (head script) above.",
      ],
    },
    tasks_inline: {
      unit: "Native Banner",
      size: "Responsive (matches the task grid)",
      paste: "Code from Adsterra → Native Banner → GET CODE.",
      notes: [
        "Native Banner blends in between task cards and earns the most for content grids.",
        "Banner 300×250 is a fine fallback.",
      ],
    },
    wallet_top: {
      unit: "Banner 300×250 (medium rectangle)",
      size: "300×250",
      paste: "Code from Adsterra → Banner 300x250 → GET CODE.",
      notes: ["A rectangle reads cleanly above the wallet balance card."],
    },
    landing_mid: {
      unit: "Banner 728×90 or Native Banner",
      size: "728×90 / responsive",
      paste: "Code from Adsterra → Banner 728x90 (or Native Banner) → GET CODE.",
      notes: [
        "Public homepage gets the most traffic — use your highest-paying display unit here.",
        "Sitewide units (Popunder, Social Bar, Smartlink, In-Page Push) do NOT go here. Paste those once in Method 1 (head script) above.",
      ],
    },
  },
  monetag: {
    app_top: {
      unit: "Banner 728×90",
      size: "728×90",
      paste: "Code from Monetag → Sites → axorabd.site → + AD UNIT → Banner 728×90 → Get Code.",
      notes: ["Leaderboard at the top of every app page."],
    },
    app_bottom: {
      unit: "Banner 320×50",
      size: "320×50",
      paste: "Code from Monetag → Banner 320×50 → Get Code.",
      notes: ["Mobile-first bottom bar."],
    },
    tasks_inline: {
      unit: "Native Banner",
      size: "Responsive",
      paste: "Code from Monetag → Native Banner → Get Code.",
      notes: ["Blends into the task grid; Banner 300×250 is a fine backup."],
    },
    wallet_top: {
      unit: "Banner 300×250",
      size: "300×250",
      paste: "Code from Monetag → Banner 300×250 → Get Code.",
      notes: ["Medium rectangle reads cleanly above the wallet balance."],
    },
    landing_mid: {
      unit: "Banner 728×90 or Native Banner",
      size: "728×90 / responsive",
      paste: "Code from Monetag → Banner 728×90 (or Native Banner) → Get Code.",
      notes: [
        "Sitewide units (In-Page Push, OnClick / Popunder, Vignette, Interstitial) belong in Method 1 (head script) above — not in a placement.",
      ],
    },
  },
};

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
