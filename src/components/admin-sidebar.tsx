import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Gavel, Wallet, FileCheck, Users, Building2,
  ListTodo, Bell, Settings as SettingsIcon, ShieldAlert, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/appeals", label: "Appeals Center", icon: Gavel },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/submissions", label: "Submissions", icon: FileCheck },
  { to: "/users", label: "Users", icon: Users },
  { to: "/publishers", label: "Publishers", icon: Building2 },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/security-logs", label: "Security Logs", icon: ShieldAlert },
] as const;

export function AdminSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
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
              {it.label}
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
