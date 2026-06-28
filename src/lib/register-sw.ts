// Guarded service worker registration. Registers only in published production builds.
// In Lovable preview/dev/iframe, unregisters any stale /sw.js to keep the editor clean.

const SW_PATH = "/sw.js";

function isLovablePreviewHost(host: string) {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const url = new URL(window.location.href);
  const killSwitch = url.searchParams.get("sw") === "off";
  const host = window.location.hostname;
  const refused = !import.meta.env.PROD || inIframe || isLovablePreviewHost(host) || killSwitch;

  if (refused) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => r.active?.scriptURL.endsWith(SW_PATH) || r.installing?.scriptURL.endsWith(SW_PATH) || r.waiting?.scriptURL.endsWith(SW_PATH))
          .map((r) => r.unregister()),
      );
    } catch { /* ignore */ }
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch { /* ignore */ }
}
