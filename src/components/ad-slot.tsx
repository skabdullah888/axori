import { useEffect, useRef } from "react";
import { useAdsConfig } from "@/hooks/use-ads-config";
import { isPlacementActive, type AdPlacement } from "@/lib/ads";
import { FakeAdBanner } from "@/components/fake-ad-card";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// Stable-ish fallback index per placement so different slots show different ads.
const PLACEMENT_INDEX: Record<AdPlacement, number> = {
  app_top: 0,
  app_bottom: 1,
  tasks_inline: 2,
  wallet_top: 3,
  landing_mid: 0,
};

let adsenseScriptLoadedFor: string | null = null;

function ensureAdsenseScript(client: string) {
  if (typeof window === "undefined" || !client) return;
  if (adsenseScriptLoadedFor === client) return;
  if (adsenseScriptLoadedFor && adsenseScriptLoadedFor !== client) {
    document
      .querySelectorAll('script[data-axora-adsense="1"]')
      .forEach((el) => el.parentNode?.removeChild(el));
  }
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  s.setAttribute("data-axora-adsense", "1");
  document.head.appendChild(s);
  adsenseScriptLoadedFor = client;
}

/**
 * Injects a raw HTML/script snippet (used by Adsterra & Monetag).
 * Re-creates inline <script> tags so they actually execute.
 */
function injectSnippet(container: HTMLElement, snippet: string) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.innerHTML = snippet;
  Array.from(wrap.childNodes).forEach((node) => {
    if (node.nodeName === "SCRIPT") {
      const old = node as HTMLScriptElement;
      const fresh = document.createElement("script");
      Array.from(old.attributes).forEach((a) => fresh.setAttribute(a.name, a.value));
      if (old.textContent) fresh.textContent = old.textContent;
      container.appendChild(fresh);
    } else {
      container.appendChild(node);
    }
  });
}

/**
 * Renders an ad unit for the given placement using whichever provider the
 * admin selected. Renders nothing (and takes no space) when ads are globally
 * disabled, when the placement is disabled, or when required fields are
 * missing — so wrapping sections collapse cleanly.
 */
export function AdSlot({
  placement,
  className = "",
  format = "auto",
}: {
  placement: AdPlacement;
  className?: string;
  format?: "auto" | "fluid" | "rectangle";
}) {
  const cfg = useAdsConfig();
  const slot = cfg.slots?.[placement];
  const active = isPlacementActive(cfg, placement);
  const snippetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;
    if (cfg.provider === "adsense") {
      ensureAdsenseScript(cfg.client);
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // already pushed or not yet ready
      }
    } else if (snippetRef.current && slot?.code) {
      injectSnippet(snippetRef.current, slot.code);
    }
  }, [active, cfg.provider, cfg.client, slot?.slot, slot?.code]);

  if (!active) return null;

  return (
    <div className={`my-4 w-full overflow-hidden text-center ${className}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
        Advertisement
      </div>
      {cfg.provider === "adsense" ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={cfg.client}
          data-ad-slot={slot!.slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : (
        <div ref={snippetRef} className="inline-block max-w-full" />
      )}
    </div>
  );
}
