import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSiteLogo } from "@/hooks/use-site-logo";


type Props = {
  label?: string;
  className?: string;
};

/** Compact inline spinner for small sections / buttons. */
export function InlineLoader({ label, className }: Props) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-8 text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

/** Centered spinner with branded ring — for medium sections. */
export function SectionLoader({ label = "Loading…", className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Skeleton grid that mimics task/card layouts while data loads. */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-border/60">
          <Skeleton className="aspect-video w-full rounded-none" />
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Skeleton list — good for notifications, activity feeds, tables. */
export function ListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Premium full-page loader — branded animated logo with orbit rings,
 * gradient mesh background, and a shimmering progress bar. Used as the
 * boot/auth-check splash for user & admin shells.
 */
export function FullPageLoader({ label = "Loading your experience" }: { label?: string }) {
  const logo = useSiteLogo();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -top-1/4 -left-1/4 h-[60vmax] w-[60vmax] rounded-full bg-primary/30 blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-1/4 -right-1/4 h-[60vmax] w-[60vmax] rounded-full bg-purple-500/20 blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 h-[40vmax] w-[40vmax] rounded-full bg-cyan-400/20 blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex flex-col items-center gap-6 animate-fade-in">
        {/* Orbiting rings around logo */}
        <div className="relative h-28 w-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/60 animate-spin"
            style={{ animationDuration: "1.4s" }}
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-b-purple-400 border-l-purple-400/60 animate-spin"
            style={{ animationDuration: "2s", animationDirection: "reverse" }}
          />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/20 via-purple-500/10 to-cyan-400/20 backdrop-blur-sm" />
          <div className="relative h-14 w-14 rounded-2xl bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/30 flex items-center justify-center ring-1 ring-border/50 animate-[pulse_2s_ease-in-out_infinite]">
            <img src={logo} alt="" className="h-9 w-9 object-contain" />
          </div>
        </div>

        {/* Label with shimmer */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium bg-gradient-to-r from-foreground via-primary to-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmer_2.5s_linear_infinite]">
            {label}
          </p>
          {/* Indeterminate progress bar */}
          <div className="relative h-1 w-48 overflow-hidden rounded-full bg-muted/50">
            <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent animate-[loader-slide_1.4s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}
