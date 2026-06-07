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
  return { enabled: false, provider: "adsense", client: "", slots: {}, adsTxt: "", verificationMeta: "", headScript: "", extraScripts: {} };
}

export function parseAdsConfig(row: any): AdsConfig {
  const provider = (row?.ads_provider as AdProvider) ?? "adsense";
  const rawExtras = (row?.ads_extra_scripts ?? {}) as Record<string, any>;
  const extraScripts: Record<string, AdExtraScript> = {};
  for (const [k, v] of Object.entries(rawExtras)) {
    if (v && typeof v === "object") {
      extraScripts[k] = {
        enabled: !!(v as any).enabled,
        code: typeof (v as any).code === "string" ? (v as any).code : "",
      };
    }
  }
  return {
    enabled: !!row?.ads_enabled,
    provider: (["adsense", "adsterra", "monetag"] as const).includes(provider) ? provider : "adsense",
    client: typeof row?.ads_client === "string" ? row.ads_client : "",
    slots: (row?.ads_slots ?? {}) as AdsConfig["slots"],
    adsTxt: typeof row?.ads_txt === "string" ? row.ads_txt : "",
    verificationMeta: typeof row?.ads_verification_meta === "string" ? row.ads_verification_meta : "",
    headScript: typeof row?.ads_head_script === "string" ? row.ads_head_script : "",
    extraScripts,
  };
}

export function isPlacementActive(cfg: AdsConfig, placement: AdPlacement): boolean {
  if (!cfg.enabled) return false;
  const s = cfg.slots[placement];
  if (!s?.enabled) return false;
  if (cfg.provider === "adsense") return !!cfg.client && !!s.slot;
  return !!s.code && s.code.trim().length > 0;
}

/**
 * Catalog of sitewide / multi-format ad units per provider. The admin UI
 * renders one toggle + textarea per entry; SiteAdsHead injects every enabled
 * snippet into <head> on every page. URL-only entries (smartlink) are stored
 * but not auto-injected — admin wires them to a button/CTA.
 */
export type AdExtraCatalogEntry = {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  /** "script" = inject into <head>. "url" = store for manual use only. */
  kind: "script" | "url";
};

export const AD_EXTRA_CATALOG: Record<AdProvider, AdExtraCatalogEntry[]> = {
  adsense: [
    {
      id: "auto_ads",
      label: "Auto Ads",
      description: "AdSense Auto Ads — Google chooses placements automatically. Paste the full <script> block from AdSense → Ads → By site → Get code.",
      placeholder: `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>`,
      kind: "script",
    },
  ],
  adsterra: [
    {
      id: "popunder",
      label: "Popunder",
      description: "Opens a popunder window on the user's first interaction. Paste the full <script> from Adsterra → Popunder → GET CODE.",
      placeholder: `<script type="text/javascript" src="//pl00000000.profitableratecpm.com/...invoke.js"></script>`,
      kind: "script",
    },
    {
      id: "social_bar",
      label: "Social Bar",
      description: "Floating sticky bar at the top/bottom (mobile & desktop). Paste from Adsterra → Social Bar → GET CODE.",
      placeholder: `<script src="//pl00000000.profitableratecpm.com/.../invoke.js" data-cfasync="false"></script>`,
      kind: "script",
    },
    {
      id: "in_page_push",
      label: "In-Page Push",
      description: "Push-style notification card inside the page. Paste from Adsterra → In-Page Push → GET CODE.",
      placeholder: `<script src="//pl00000000.profitableratecpm.com/...inpage.js"></script>`,
      kind: "script",
    },
    {
      id: "vignette",
      label: "Vignette Banner",
      description: "Full-screen banner shown between page navigations. Paste from Adsterra → Vignette Banner → GET CODE.",
      placeholder: `<script src="//pl00000000.profitableratecpm.com/...vignette.js"></script>`,
      kind: "script",
    },
    {
      id: "interstitial",
      label: "Interstitial",
      description: "Full-screen interstitial ad. Paste the snippet Adsterra gives you.",
      placeholder: `<script src="//..."></script>`,
      kind: "script",
    },
    {
      id: "native_sitewide",
      label: "Native Ads (sitewide auto)",
      description: "Sitewide native ad loader. Per-page native units are configured in the Placements section below.",
      placeholder: `<script async data-cfasync="false" src="//pl00000000.profitableratecpm.com/...native.js"></script>`,
      kind: "script",
    },
    {
      id: "smartlink",
      label: "Direct Link / Smartlink",
      description: "A URL — Adsterra auto-redirects to the highest-paying offer. Wire it to a button or share link manually.",
      placeholder: `https://www.profitableratecpm.com/abcd1234`,
      kind: "url",
    },
  ],
  monetag: [
    {
      id: "onclick_popunder",
      label: "OnClick (Popunder)",
      description: "Classic popunder triggered on click. Paste from Monetag → OnClick → Get Code.",
      placeholder: `<script src="//libtl.com/sdk.js" data-zone="0000000" data-sdk="show_0000000"></script>`,
      kind: "script",
    },
    {
      id: "in_page_push",
      label: "In-Page Push",
      description: "Push-style notification card inside the page. Paste from Monetag → In-Page Push → Get Code.",
      placeholder: `<script src="//libtl.com/sdk.js" data-zone="0000000" data-sdk="show_0000000"></script>`,
      kind: "script",
    },
    {
      id: "push_notifications",
      label: "Push Notifications",
      description: "Browser push subscription prompt. Paste from Monetag → Push Notifications → Get Code.",
      placeholder: `<script src="//thubanoa.com/1?z=0000000"></script>`,
      kind: "script",
    },
    {
      id: "vignette",
      label: "Vignette Banner",
      description: "Full-screen banner shown between page navigations.",
      placeholder: `<script src="//..." data-zone="0000000"></script>`,
      kind: "script",
    },
    {
      id: "interstitial",
      label: "Interstitial",
      description: "Full-screen interstitial between page views.",
      placeholder: `<script src="//..." data-zone="0000000"></script>`,
      kind: "script",
    },
    {
      id: "multitag",
      label: "MultiTag (all formats)",
      description: "One tag that auto-selects the best format (popunder + in-page push + vignette + push). Recommended starter.",
      placeholder: `<script src="//libtl.com/sdk.js" data-zone="0000000" data-sdk="show_0000000"></script>`,
      kind: "script",
    },
    {
      id: "native_sitewide",
      label: "Native Ads (sitewide auto)",
      description: "Sitewide native loader. Per-page native units are configured in the Placements section below.",
      placeholder: `<script src="//..." data-zone="0000000"></script>`,
      kind: "script",
    },
    {
      id: "smartlink",
      label: "Direct Link (Smartlink)",
      description: "A URL — Monetag auto-redirects to the highest-paying offer. Wire it to a button or share link manually.",
      placeholder: `https://offer.monetag.com/?z=0000000`,
      kind: "url",
    },
  ],
};

/** Returns all enabled script snippets across all providers. */
export function collectActiveExtraSnippets(cfg: AdsConfig): string[] {
  if (!cfg.enabled) return [];
  const out: string[] = [];
  const known = new Set<string>();
  for (const provider of Object.keys(AD_EXTRA_CATALOG) as AdProvider[]) {
    for (const entry of AD_EXTRA_CATALOG[provider]) {
      if (entry.kind !== "script") continue;
      const key = `${provider}_${entry.id}`;
      known.add(key);
      const s = cfg.extraScripts[key];
      if (s?.enabled && s.code.trim()) out.push(s.code);
    }
  }
  // Also allow any unknown / custom keys with code present.
  for (const [k, v] of Object.entries(cfg.extraScripts)) {
    if (!known.has(k) && v?.enabled && v.code.trim()) out.push(v.code);
  }
  return out;
}
