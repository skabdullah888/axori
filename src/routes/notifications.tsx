import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { fmtDate, EmptyState } from "@/lib/admin-utils";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    let q = supabase.from("notifications").select("*, user:profiles(username)").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("type", filter);
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("notif-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter]);

  const markRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) toast.error(error.message);
  };
  const markAllRead = async () => {
    const ids = rows.filter(r => !r.read).map(r => r.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    toast.success("All marked as read");
  };

  return (
    <AdminShell title="Notifications Center">
      <div className="flex items-center gap-2 mb-4">
        {["all", "submission", "appeal", "payment", "system"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)}>{f}</Button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="secondary" onClick={markAllRead}>Mark all read</Button>
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <EmptyState message="No notifications." /> : (
          <div className="divide-y divide-border">
            {rows.map(r => (
              <div key={r.id} className={`p-4 flex items-start gap-4 ${r.read ? "" : "bg-primary/5"}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{r.type}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{r.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    To: {r.user?.username ?? "—"} · {fmtDate(r.created_at)}
                  </div>
                </div>
                {!r.read && (
                  <Button size="sm" variant="secondary" onClick={() => markRead(r.id)}>
                    <Check className="h-4 w-4 mr-1" /> Read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>
    </AdminShell>
  );
}
