import type { ReactNode } from "react";
import { siteThemeStyleCSS, type SiteTheme } from "@/lib/site-themes";

/**
 * Scopes the active site theme's color tokens to its subtree.
 * Use to wrap the landing page and the user app shell — NOT the admin panel.
 */
export function SiteThemeRoot({
  theme,
  className = "",
  children,
}: {
  theme: SiteTheme;
  className?: string;
  children: ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: siteThemeStyleCSS(theme) }} />
      <div className={`site-theme-root ${className}`.trim()}>{children}</div>
    </>
  );
}
