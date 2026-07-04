import { useEffect } from "react";
import { useSiteLogo } from "@/hooks/use-site-logo";

/**
 * Syncs the browser tab favicon with the admin-configured site logo.
 * Replaces any existing <link rel="icon"> / apple-touch-icon tags.
 */
export function DynamicFavicon() {
  const logo = useSiteLogo();
  useEffect(() => {
    if (!logo || typeof document === "undefined") return;
    const setLink = (rel: string) => {
      const existing = document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`);
      existing.forEach((l) => l.parentNode?.removeChild(l));
      const link = document.createElement("link");
      link.rel = rel;
      link.href = logo;
      document.head.appendChild(link);
    };
    setLink("icon");
    setLink("apple-touch-icon");
  }, [logo]);
  return null;
}
