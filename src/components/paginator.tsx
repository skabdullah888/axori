import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function usePagedSlice<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function Paginator({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const go = (p: number) => onChange(Math.min(pages, Math.max(1, p)));

  // Window of up to 5 page buttons around current
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  const nums: number[] = [];
  for (let i = start; i <= end; i++) nums.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
      <Button size="sm" variant="outline" onClick={() => go(page - 1)} disabled={page === 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {start > 1 && (
        <>
          <Button size="sm" variant={page === 1 ? "default" : "outline"} onClick={() => go(1)}>1</Button>
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}
      {nums.map((n) => (
        <Button key={n} size="sm" variant={page === n ? "default" : "outline"} onClick={() => go(n)}>
          {n}
        </Button>
      ))}
      {end < pages && (
        <>
          {end < pages - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Button size="sm" variant={page === pages ? "default" : "outline"} onClick={() => go(pages)}>
            {pages}
          </Button>
        </>
      )}
      <Button size="sm" variant="outline" onClick={() => go(page + 1)} disabled={page === pages}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <span className="ml-2 text-xs text-muted-foreground">
        Page {page} / {pages} · {total} items
      </span>
    </div>
  );
}
