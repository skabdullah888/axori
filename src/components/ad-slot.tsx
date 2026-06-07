import { useEffect, useRef } from "react";
import { useAdsConfig } from "@/hooks/use-ads-config";
import type { AdPlacement } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptLoadedFor: string | null = null;

function ensureAdsenseScript(client: string) {
  if (typeof window === "undefined" || !client) return;
  if (scriptLoadedFor === client) return;
  // Remove any previous script if client changed
  if (scriptLoadedFor && scriptLoadedFor !== client) {
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
  scriptLoadedFor = client;
}

/**
 * Renders a Google AdSense unit for the given placement.
 * Silently renders nothing when ads are disabled globally,
 * the placement is disabled, or the slot/client is not configured.
 *
 * Pure presentational — no business logic, no data fetching beyond config.
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
  const insRef = useRef<HTMLModElement | null>(null);

  const active = cfg.enabled && !!cfg.client && !!slot?.enabled && !!slot?.slot;

  useEffect(() => {
    if (!active) return;
    ensureAdsenseScript(cfg.client);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore: adsense already pushed or script not yet ready
    }
  }, [active, cfg.client, slot?.slot]);

  if (!active) return null;

  return (
    <div className={`my-4 w-full overflow-hidden text-center ${className}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">
        Advertisement
      </div>
      <ins
        ref={insRef as any}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={cfg.client}
        data-ad-slot={slot!.slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
