import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

/**
 * Renders a Back button only when the app is running as an installed PWA.
 * - Desktop (window-controls-overlay): sits in the title-bar overlay area.
 * - Mobile/standalone: small floating button top-left, respecting safe-area.
 * Hidden in normal browser tabs because the browser already provides Back.
 */
export function PWABackButton() {
  const router = useRouter();
  const [mode, setMode] = useState<"hidden" | "standalone" | "wco">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const compute = () => {
      const wco = window.matchMedia("(display-mode: window-controls-overlay)").matches;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari
        (window.navigator as any).standalone === true;
      if (wco) setMode("wco");
      else if (standalone) setMode("standalone");
      else setMode("hidden");
    };

    compute();
    const mq1 = window.matchMedia("(display-mode: standalone)");
    const mq2 = window.matchMedia("(display-mode: window-controls-overlay)");
    mq1.addEventListener?.("change", compute);
    mq2.addEventListener?.("change", compute);
    return () => {
      mq1.removeEventListener?.("change", compute);
      mq2.removeEventListener?.("change", compute);
    };
  }, []);

  if (mode === "hidden") return null;

  const goBack = () => {
    try {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.history.back();
      } else {
        router.navigate({ to: "/dashboard" });
      }
    } catch {
      router.navigate({ to: "/dashboard" });
    }
  };

  if (mode === "wco") {
    return (
      <button
        onClick={goBack}
        aria-label="Go back"
        data-allow-offline="true"
        className="pwa-back-wco fixed top-0 left-0 z-[9999] h-[env(titlebar-area-height,32px)] px-3 flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-foreground/10 active:bg-foreground/15 transition-colors"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    );
  }

  // standalone (mobile / installed without WCO)
  return (
    <button
      onClick={goBack}
      aria-label="Go back"
      data-allow-offline="true"
      className="fixed left-3 z-[9999] h-10 w-10 rounded-full flex items-center justify-center bg-background/70 backdrop-blur-md border border-border/60 shadow-lg text-foreground/90 hover:bg-background/90 active:scale-95 transition-all"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
