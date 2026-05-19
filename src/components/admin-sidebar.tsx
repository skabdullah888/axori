import { useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Gavel, Wallet, Users, Building2,
  ListTodo, Bell, Settings as SettingsIcon, ShieldAlert, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const BASE = "/skabdullah_999_sg/admin";
const items = [
  { to: `${BASE}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
  { to: `${BASE}/appeals`, label: "Appeals Center", icon: Gavel },
  { to: `${BASE}/payments`, label: "Payments", icon: Wallet },
  { to: `${BASE}/users`, label: "Users", icon: Users },
  { to: `${BASE}/publishers`, label: "Publishers", icon: Building2 },
  { to: `${BASE}/tasks`, label: "Tasks", icon: ListTodo },
  { to: `${BASE}/notifications`, label: "Notifications", icon: Bell },
  { to: `${BASE}/settings`, label: "Settings", icon: SettingsIcon },
  { to: `${BASE}/security-logs`, label: "Security Logs", icon: ShieldAlert },
] as const;

export function AdminSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  const loadUnread = async () => {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("admin_targeted", true)
      .eq("read", false);
    setUnread(count ?? 0);
  };

  useEffect(() => {
    loadUnread();
    const ch = supabase.channel("sb-notif-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => loadUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Reset badge when visiting notifications page
  useEffect(() => {
    if (path === `${BASE}/notifications` && unread > 0) {
      supabase.from("notifications")
        .update({ read: true })
        .eq("admin_targeted", true)
        .eq("read", false)
        .then(() => loadUnread());
    }
  }, [path]);

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
          const showBadge = it.to === `${BASE}/notifications` && unread > 0;
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
              {showBadge && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                  {unread > 99 ? "99+" : unread}
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
