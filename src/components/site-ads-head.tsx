import { useEffect } from "react";
import { useAdsConfig } from "@/hooks/use-ads-config";
import { collectActiveExtraSnippets } from "@/lib/ads";

const META_MARK = "data-axora-ads-verify";
const SCRIPT_MARK = "data-axora-ads-head";

/**
 * Injects AdSense verification artefacts into <head> on every page so the
 * admin can pass Google AdSense / Adsterra / Monetag site verification
 * without touching code. Sources its values from public.settings via the
 * useAdsConfig hook so changes from the admin UI apply in real-time.
 *
 * Handles all three AdSense verification methods:
 *  1. AdSense code snippet  → admin pastes into "Head script" (or just sets Publisher ID)
 *  2. Ads.txt snippet       → admin pastes into "ads.txt"; served at /ads.txt
 *  3. Meta tag              → admin pastes into "Verification meta tag"
 */
export function SiteAdsHead() {
  const cfg = useAdsConfig();

  // 1. google-site-verification meta tag
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.querySelectorAll(`meta[${META_MARK}="1"]`).forEach((el) => el.remove());
    const raw = (cfg.verificationMeta ?? "").trim();
    if (!raw) return;
    const meta = document.createElement("meta");
    meta.setAttribute(META_MARK, "1");
    // Accept either the full <meta ...> tag or just the content value.
    const tagMatch = raw.match(/content\s*=\s*"([^"]+)"/i);
    meta.setAttribute("name", "google-site-verification");
    meta.setAttribute("content", tagMatch ? tagMatch[1] : raw);
    document.head.appendChild(meta);
  }, [cfg.verificationMeta]);

  // 2. Sitewide head script (AdSense code snippet, etc.)
  //    Also auto-injects the AdSense loader when only Publisher ID is set.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.querySelectorAll(`script[${SCRIPT_MARK}="1"]`).forEach((el) => el.remove());
    document.querySelectorAll(`[${SCRIPT_MARK}="1"]`).forEach((el) => el.remove());

    const snippets: string[] = [];

    let head = (cfg.headScript ?? "").trim();
    if (!head && cfg.provider === "adsense" && cfg.client) {
      head = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.client}" crossorigin="anonymous"></script>`;
    }
    if (head) snippets.push(head);

    // Sitewide multi-format ad units (popunder, social bar, push, etc.)
    for (const s of collectActiveExtraSnippets(cfg)) snippets.push(s);

    for (const snippet of snippets) {
      const wrap = document.createElement("div");
      wrap.innerHTML = snippet;
      Array.from(wrap.childNodes).forEach((node) => {
        if (node.nodeName === "SCRIPT") {
          const old = node as HTMLScriptElement;
          const fresh = document.createElement("script");
          Array.from(old.attributes).forEach((a) => fresh.setAttribute(a.name, a.value));
          if (old.textContent) fresh.textContent = old.textContent;
          fresh.setAttribute(SCRIPT_MARK, "1");
          document.head.appendChild(fresh);
        } else if (node.nodeType === 1) {
          const el = node as HTMLElement;
          el.setAttribute(SCRIPT_MARK, "1");
          document.head.appendChild(el);
        }
      });
    }
  }, [cfg.headScript, cfg.provider, cfg.client, cfg.enabled, cfg.extraScripts]);

  return null;
}
