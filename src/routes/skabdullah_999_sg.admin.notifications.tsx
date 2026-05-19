import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, Trash2, Pencil, Send, Bell } from "lucide-react";
import { fmtDate, EmptyState } from "@/lib/admin-utils";

export const Route = createFileRoute("/skabdullah_999_sg/admin/notifications")({ component: NotificationsPage });

type Tab = "admin" | "history" | "compose";

async function withNotificationUsers(rows: any[]) {
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  if (!userIds.length) return rows;
  const { data: profiles } = await supabase.from("profiles").select("user_id,username").in("user_id", userIds);
  const byUserId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return rows.map((r) => ({ ...r, user: byUserId.get(r.user_id) ?? null }));
}

function NotificationsPage() {
  return (
    <AdminShell title="Notifications Center">
      <Tabs defaultValue="admin">
        <TabsList>
          <TabsTrigger value="admin"><Bell className="h-4 w-4 mr-1" />Admin Inbox</TabsTrigger>
          <TabsTrigger value="compose"><Send className="h-4 w-4 mr-1" />Send Notification</TabsTrigger>
          <TabsTrigger value="history">Sent History</TabsTrigger>
        </TabsList>
        <TabsContent value="admin"><AdminInbox /></TabsContent>
        <TabsContent value="compose"><ComposePanel /></TabsContent>
        <TabsContent value="history"><HistoryPanel /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

/** Admin-targeted critical alerts only (excludes general user activity logs). */
function AdminInbox() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [edit, setEdit] = useState<any | null>(null);

  const load = async () => {
    let q = supabase.from("notifications")
      .select("*")
      .eq("admin_targeted", true)
      .order("created_at", { ascending: false })
      .limit(300);
    if (filter !== "all") q = q.eq("type", filter);
    const { data } = await q;
    setRows(await withNotificationUsers(data ?? []));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("notif-admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter]);

  const toggleRead = async (r: any) => {
    await supabase.from("notifications").update({ read: !r.read }).eq("id", r.id);
  };
  const del = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    await supabase.from("notifications").delete().eq("id", id);
    toast.success("Deleted");
  };
  const saveEdit = async () => {
    if (!edit) return;
    const { error } = await supabase.from("notifications")
      .update({ title: edit.title, message: edit.message, type: edit.type })
      .eq("id", edit.id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); setEdit(null); }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {["all", "appeal", "payment", "system", "warning", "error"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)}>{f}</Button>
        ))}
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <EmptyState message="No admin notifications." /> : (
          <div className="divide-y divide-border">
            {rows.map(r => (
              <div key={r.id} className={`p-4 flex items-start gap-4 ${r.read ? "" : "bg-primary/5"}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{r.type}</span>
                    {!r.read && <span className="text-[10px] uppercase font-semibold text-primary">NEW</span>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{r.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.user?.username ? `To: ${r.user.username} · ` : ""}{fmtDate(r.created_at)}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => toggleRead(r)}>
                    <Check className="h-4 w-4 mr-1" />{r.read ? "Unread" : "Read"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEdit({ ...r })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => del(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit notification</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
              <div><Label>Type</Label><Input value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} /></div>
              <div><Label>Message</Label><Textarea rows={4} value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComposePanel() {
  const [mode, setMode] = useState<"user" | "global">("user");
  const [target, setTarget] = useState(""); // username or user id
  const [type, setType] = useState("system");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) { toast.error("Title and message are required"); return; }
    setSending(true);
    try {
      if (mode === "user") {
        if (!target.trim()) { toast.error("Enter a username or user ID"); return; }
        // Resolve target: accept auth user ID, profile ID, or username
        let userId: string | null = null;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(target.trim());
        if (isUuid) {
          const { data } = await supabase.from("profiles").select("user_id").or(`user_id.eq.${target.trim()},id.eq.${target.trim()}`).maybeSingle();
          if (data && !data.user_id) { toast.error("This profile has no login user ID"); return; }
          userId = data?.user_id ?? target.trim();
        }
        if (!userId) {
          const { data } = await supabase.from("profiles").select("user_id").eq("username", target.trim()).maybeSingle();
          userId = data?.user_id ?? null;
        }
        if (!userId) { toast.error("User not found"); return; }
        const { error } = await supabase.from("notifications").insert({ user_id: userId, type, title, message });
        if (error) throw error;
        toast.success("Notification sent");
      } else {
        // Global: insert one row per active user
        const { data: users } = await supabase.from("profiles").select("user_id").eq("status", "active").not("user_id", "is", null);
        if (!users?.length) { toast.error("No active users"); return; }
        const rows = users.map(u => ({ user_id: u.user_id, type, title, message }));
        const { error } = await supabase.from("notifications").insert(rows);
        if (error) throw error;
        toast.success(`Sent to ${users.length} users`);
      }
      setTitle(""); setMessage(""); setTarget("");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSending(false); }
  };

  return (
    <Card className="mt-4 max-w-2xl">
      <CardHeader><CardTitle>Compose notification</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "user" ? "default" : "secondary"} onClick={() => setMode("user")}>To specific user</Button>
          <Button size="sm" variant={mode === "global" ? "default" : "secondary"} onClick={() => setMode("global")}>Global (all active users)</Button>
        </div>
        {mode === "user" && (
          <div>
            <Label>Username or User ID</Label>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. john_doe or uuid…" />
          </div>
        )}
        <div>
          <Label>Type</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {["system", "info", "success", "warning", "error", "payment", "appeal"].map(t => (
              <Button key={t} size="sm" variant={type === t ? "default" : "secondary"} onClick={() => setType(t)}>{t}</Button>
            ))}
          </div>
        </div>
        <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>Message</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        <Button onClick={send} disabled={sending}>
          <Send className="h-4 w-4 mr-1" />{sending ? "Sending…" : "Send"}
        </Button>
      </CardContent>
    </Card>
  );
}

function HistoryPanel() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("notifications")
      .select("*")
      .order("created_at", { ascending: false }).limit(500);
    setRows(await withNotificationUsers(data ?? []));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("notif-history-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("notifications").delete().eq("id", id);
  };

  return (
    <Card className="mt-4"><CardContent className="p-0">
      {rows.length === 0 ? <EmptyState message="No notifications." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Recipient</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Message</th>
                <th className="text-left px-4 py-3">Sent</th>
                <th className="text-left px-4 py-3">Read</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-4 py-3">{r.user?.username ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{r.type}</td>
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">{r.message}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3">{r.read ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="destructive" onClick={() => del(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent></Card>
  );
}
