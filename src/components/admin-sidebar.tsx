import { useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Gavel, Wallet, Users, Building2,
  ListTodo, Bell, Settings as SettingsIcon, ShieldAlert, LogOut, Video, MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const BASE = "/skabdullah_999_sg/admin";
const items = [
  { to: `${BASE}/dashboard`, label: "Dashboard", icon: LayoutDashboard, types: [] as string[] },
  { to: `${BASE}/appeals`, label: "Appeals Center", icon: Gavel, types: ["appeal_new"] },
  { to: `${BASE}/payments`, label: "Payments", icon: Wallet, types: ["activation_request", "deposit_request", "withdrawal_request"] },
  { to: `${BASE}/users`, label: "Users", icon: Users, types: [] as string[] },
  { to: `${BASE}/publishers`, label: "Publishers", icon: Building2, types: [] as string[] },
  { to: `${BASE}/tasks`, label: "Tasks", icon: ListTodo, types: ["task_published", "submission_new"] },
  { to: `${BASE}/notifications`, label: "Notifications", icon: Bell, types: ["*"] },
  { to: `${BASE}/settings`, label: "Settings", icon: SettingsIcon, types: [] as string[] },
  { to: `${BASE}/tutorials`, label: "Tutorial Videos", icon: Video, types: [] as string[] },
  { to: `${BASE}/security-logs`, label: "Security Logs", icon: ShieldAlert, types: [] as string[] },
];

export function AdminSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [unreadByType, setUnreadByType] = useState<Record<string, number>>({});

  const loadUnread = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("type")
      .eq("admin_targeted", true)
      .eq("read", false);
    const rows = (data as { type: string }[] | null) ?? [];
    const map: Record<string, number> = {};
    for (const r of rows) map[r.type] = (map[r.type] ?? 0) + 1;
    setUnreadByType(map);
    setUnread(rows.length);
  };

  useEffect(() => {
    loadUnread();
    const ch = supabase.channel("sb-notif-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => loadUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Mark relevant notifications as read when visiting matching section
  useEffect(() => {
    const it = items.find((i) => path === i.to || path.startsWith(i.to + "/"));
    if (!it) return;
    const isNotifPage = it.types.includes("*");
    if (isNotifPage) {
      if (unread > 0) {
        supabase.from("notifications").update({ read: true })
          .eq("admin_targeted", true).eq("read", false).then(() => loadUnread());
      }
      return;
    }
    if (it.types.length === 0) return;
    const hasUnread = it.types.some((t) => (unreadByType[t] ?? 0) > 0);
    if (!hasUnread) return;
    supabase.from("notifications").update({ read: true })
      .eq("admin_targeted", true).eq("read", false)
      .in("type", it.types as unknown as string[]).then(() => loadUnread());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, unreadByType, unread]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/skabdullah_999_sg/admin/login" });
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="text-xl font-bold tracking-tight text-foreground">TaskAdmin</div>
        <div className="text-xs text-muted-foreground mt-0.5">Control Center</div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map((it) => {
          const active = path === it.to || path.startsWith(it.to + "/");
          const Icon = it.icon;
          const count = it.types.includes("*")
            ? unread
            : it.types.reduce((sum, t) => sum + (unreadByType[t] ?? 0), 0);
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{it.label}</span>
              {count > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="m-3 flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-secondary hover:bg-accent transition-colors"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </aside>
  );
}
