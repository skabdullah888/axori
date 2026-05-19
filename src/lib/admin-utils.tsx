import { supabase } from "@/integrations/supabase/client";

export async function notify(userId: string | null, type: string, title: string, message: string) {
  if (!userId) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();
  await supabase.from("notifications").insert({ user_id: profile?.user_id ?? userId, type, title, message });
}

export function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}

export function fmtMoney(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return `৳${v.toFixed(2)}`;
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    active: "bg-success/15 text-success",
    banned: "bg-destructive/15 text-destructive",
    paused: "bg-muted text-muted-foreground",
    completed: "bg-primary/15 text-primary",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-16 text-sm text-muted-foreground">{message}</div>;
}
