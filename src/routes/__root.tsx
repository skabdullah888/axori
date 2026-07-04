import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter,
  HeadContent, Scripts, Link,
} from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";
import { SiteAdsHead } from "@/components/site-ads-head";
import { TopProgressBar } from "@/components/top-progress-bar";
import { OfflineBanner } from "@/components/offline-banner";
import { registerServiceWorker } from "@/lib/register-sw";
import { PWABackButton } from "@/components/pwa-back-button";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
        <Link to="/dashboard" className="inline-block mt-6 px-4 py-2 rounded-md bg-primary text-primary-foreground">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 px-4 py-2 rounded-md bg-primary text-primary-foreground"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AxoraBD - Social Engagement & Growth Platform in Bangladesh" },
      { name: "description", content: "AxoraBD (Axora BD) is Bangladesh's social engagement platform. Get real Likes, Comments, Follows, Subscribers, Views & Shares for your YouTube, Facebook, TikTok, Instagram — earn rewards by engaging with others." },
      { name: "keywords", content: "axora bd, axorabd, axora, axora bangladesh, social engagement bangladesh, real likes bd, buy real followers bangladesh, youtube subscribers bd, facebook page likes bd, tiktok followers bangladesh, instagram followers bd, social media growth bangladesh, engagement exchange, like comment follow subscribe" },
      { name: "author", content: "AxoraBD" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: "AxoraBD" },
      { property: "og:title", content: "AxoraBD - Social Engagement & Growth Platform in Bangladesh" },
      { name: "twitter:title", content: "AxoraBD - Social Engagement & Growth Platform in Bangladesh" },
      { property: "og:description", content: "Grow your social presence with AxoraBD. Real Likes, Comments, Follows, Subscribers & Views from Bangladeshi users — engage with others and get engagement back." },
      { name: "twitter:description", content: "Grow on YouTube, Facebook, TikTok & Instagram with real engagement from AxoraBD community." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/20640938-27fb-4380-96cc-0d7c46fe88ab" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/20640938-27fb-4380-96cc-0d7c46fe88ab" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "bn_BD" },
      { name: "theme-color", content: "#7c3aed" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AxoraBD" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    registerServiceWorker();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    // Block write actions when offline — surfaces a toast instead of silent failure.
    const blockOffline = (e: Event) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const t = e.target as HTMLElement | null;
        if (!t) return;
        const el = t.closest("button, [role='button'], a[data-needs-online], form");
        if (!el) return;
        if (el.tagName === "A" || el.getAttribute("data-allow-offline") === "true") return;
        if (el.tagName === "BUTTON" && (el as HTMLButtonElement).type === "button" && el.getAttribute("data-needs-online") !== "true" && el.closest("[data-allow-offline='true']")) return;
        if (el.tagName === "FORM" || (el as HTMLButtonElement).type === "submit" || el.getAttribute("data-needs-online") === "true") {
          e.preventDefault();
          e.stopPropagation();
          import("sonner").then(({ toast }) => toast.error("You are offline. Please reconnect to continue."));
        }
      }
    };
    document.addEventListener("click", blockOffline, true);
    document.addEventListener("submit", blockOffline, true);
    return () => {
      subscription.unsubscribe();
      document.removeEventListener("click", blockOffline, true);
      document.removeEventListener("submit", blockOffline, true);
    };
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <SiteAdsHead />
      <TopProgressBar />
      <OfflineBanner />
      <PWABackButton />
      <Outlet />
      <Sonner />
    </QueryClientProvider>
  );
}
