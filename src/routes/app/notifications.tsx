import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserShell } from "@/components/user-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Axora" }] }),
  component: NotificationsPage,
});

type Notif = {
  id: string; title: string; message: string; type: string;
  read: boolean; created_at: string;
};

function NotificationsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!session?.user) return;
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(200);
    setItems((data as Notif[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!session?.user) return;
    load();
    const ch = supabase.channel(`notifs-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const markAll = async () => {
    if (!session?.user) return;
    const { error } = await supabase.from("notifications").update({ read: true })
      .eq("user_id", session.user.id).eq("read", false);
    if (error) toast.error(error.message); else { toast.success("All marked as read"); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const typeColor = (t: string) => {
    if (t.includes("approved") || t.includes("success")) return "border-success/40 text-success bg-success/10";
    if (t.includes("rejected") || t.includes("fail")) return "border-destructive/40 text-destructive bg-destructive/10";
    if (t.includes("pending") || t.includes("warning")) return "border-warning/40 text-warning bg-warning/10";
    return "border-primary/40 text-primary bg-primary/10";
  };

  return (
    <UserShell title="Notifications">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{items.length} total · {items.filter(i => !i.read).length} unread</p>
        <Button variant="outline" size="sm" onClick={markAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button>
      </div>
      {loading ? (
        <div className="text-center text-muted-foreground py-10">Loading…</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No notifications yet.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={`transition-all ${!n.read ? "border-primary/40 bg-primary/5" : ""}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${typeColor(n.type)}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{n.title}</p>
                    {!n.read && <Badge className="bg-primary text-primary-foreground text-[10px] h-4 px-1.5">NEW</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </UserShell>
  );
}
