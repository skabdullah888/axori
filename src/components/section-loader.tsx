import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
