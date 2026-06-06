import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListTodo, FileCheck, Gavel, Wallet, ArrowDownToLine,
  ArrowUpFromLine, Megaphone, Users2, Bell, User, Settings as SettingsIcon,
  LogOut, ChevronDown, Sparkles, Menu, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSiteTheme } from "@/hooks/use-site-theme";
import { SiteThemeRoot } from "@/components/site-theme-root";

const items = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, types: [] as string[] },
  { to: "/app/tasks", label: "Browse Tasks", icon: ListTodo, types: [] as string[] },
  { to: "/app/submissions", label: "My Submissions", icon: FileCheck, types: ["submission_approved", "submission_rejected"] },
  { to: "/app/appeals", label: "Appeals", icon: Gavel, types: ["appeal_approved", "appeal_rejected", "appeal_response"] },
  { to: "/app/wallet", label: "Wallet", icon: Wallet, types: ["deposit_approved", "deposit_rejected", "withdrawal_approved", "withdrawal_rejected", "activation_approved", "activation_rejected"] },
  { to: "/app/deposit", label: "Deposit", icon: ArrowDownToLine, types: ["deposit_approved", "deposit_rejected"] },
  { to: "/app/withdraw", label: "Withdraw", icon: ArrowUpFromLine, types: ["withdrawal_approved", "withdrawal_rejected"] },
  { to: "/app/publish", label: "Publish Task", icon: Megaphone, types: ["submission_new", "task_published"] },
  { to: "/app/referrals", label: "Referrals", icon: Users2, types: ["referral_joined", "referral_bonus"] },
  { to: "/app/notifications", label: "Notifications", icon: Bell, types: ["*"] },
  { to: "/app/profile", label: "Profile", icon: User, types: ["account_status_changed"] },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon, types: [] as string[] },
];

type Profile = {
  id: string; user_id: string; username: string; email: string | null;
  status: string; balance: number; avatar_url: string | null;
  full_name?: string | null;
};

export function UserShell({ title, children }: { title: string; children: ReactNode }) {
  const { isAuthed, loading, session } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unread, setUnread] = useState(0);
  const [unreadByType, setUnreadByType] = useState<Record<string, number>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useSiteTheme();

  const [profileChecked, setProfileChecked] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!isAuthed) { navigate({ to: "/auth/login" }); return; }
  }, [loading, isAuthed, navigate, session]);

  const loadProfile = async () => {
    if (!session?.user) return;
    setProfileError("");
    let data: Profile | null = null;
    let error: unknown = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      data = result.data as Profile | null;
      error = result.error;
      if (data || error) break;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    if (error) {
      setProfileError("We couldn't load your account profile. Please refresh the page.");
      setProfileChecked(true);
      return;
    }
    if (data) {
      setProfile(data as Profile);
    } else {
      setProfileError("Your user profile is still being prepared. Please refresh in a moment.");
      setProfileChecked(true);
      return;
    }
    setProfileChecked(true);
  };

  const loadUnread = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("notifications").select("type")
      .eq("user_id", session.user.id).eq("read", false).eq("admin_targeted", false);
    const rows = (data as { type: string }[] | null) ?? [];
    const map: Record<string, number> = {};
    for (const r of rows) map[r.type] = (map[r.type] ?? 0) + 1;
    setUnreadByType(map);
    setUnread(rows.length);
  };

  useEffect(() => {
    if (!session?.user) return;
    loadProfile(); loadUnread();
    const ch = supabase.channel(`user-shell-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${session.user.id}` }, loadProfile)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` }, loadUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) return;
    const it = items.find((i) => path === i.to || path.startsWith(i.to + "/"));
    if (!it) return;
    const trackedTypes = items.flatMap((i) => (i.types.includes("*") ? [] : i.types));
    const isNotifPage = it.types.includes("*");
    if (isNotifPage) {
      const untrackedUnread = Object.entries(unreadByType)
        .filter(([t, n]) => !trackedTypes.includes(t) && n > 0)
        .map(([t]) => t);
      if (untrackedUnread.length > 0) {
        supabase.from("notifications").update({ read: true })
          .eq("user_id", session.user.id).eq("read", false).eq("admin_targeted", false)
          .in("type", untrackedUnread).then(() => loadUnread());
      }
      return;
    }
    if (it.types.length === 0) return;
    const hasUnread = it.types.some((t) => (unreadByType[t] ?? 0) > 0);
    if (!hasUnread) return;
    supabase.from("notifications").update({ read: true })
      .eq("user_id", session.user.id).eq("read", false).eq("admin_targeted", false)
      .in("type", it.types as string[]).then(() => loadUnread());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, unreadByType, unread]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth/login" });
  };

  if (loading || !isAuthed || !profileChecked) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (profileError) {
    return <div className="min-h-screen flex items-center justify-center px-4 text-center text-muted-foreground">{profileError}</div>;
  }

  const Sidebar = (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform",
      "lg:translate-x-0",
      mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
    )}>
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-md shadow-primary/30">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-foreground">AxoraBD</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Earn tasks</div>
          </div>
        </div>
        <button className="lg:hidden text-muted-foreground" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map((it) => {
          const active = path === it.to || path.startsWith(it.to + "/");
          const Icon = it.icon;
          const trackedTypes = new Set(
            items.flatMap((i) => (i.types.includes("*") ? [] : i.types))
          );
          const count = it.types.includes("*")
            ? Object.entries(unreadByType).reduce((s, [t, n]) => s + (trackedTypes.has(t) ? 0 : n), 0)
            : it.types.reduce((sum, t) => sum + (unreadByType[t] ?? 0), 0);
          return (
            <Link key={it.to} to={it.to} onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all",
                active
                  ? "bg-gradient-to-r from-primary/20 to-transparent text-foreground border-l-2 border-primary"
                  : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:translate-x-0.5",
              )}>
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
    </aside>
  );

  const isActive = profile?.status === "active";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {Sidebar}
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="lg:ml-64">
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
            <h1 className="text-base lg:text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold">৳{Number(profile?.balance ?? 0).toFixed(2)}</span>
            </div>
            <Badge variant={isActive ? "default" : "secondary"} className={cn(isActive ? "bg-success/20 text-success border-success/30" : "bg-warning/20 text-warning border-warning/30")}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (profile?.full_name?.[0] ?? profile?.username?.[0])?.toUpperCase() ?? "U"
                  )}
                </div>
                <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">{profile?.full_name || profile?.username}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium truncate">{profile?.full_name || profile?.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                  <Link to="/app/profile" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                  <Link to="/app/settings" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
                    <SettingsIcon className="h-4 w-4" /> Settings
                  </Link>
                  <button onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-destructive border-t border-border">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-6 animate-in fade-in duration-300">{children}</main>
      </div>
    </div>
  );
}

export function LockOverlay({ message = "Activate your account to unlock this feature." }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-10 backdrop-blur-sm bg-background/60 flex items-center justify-center rounded-xl">
      <div className="text-center px-6 py-8 max-w-sm">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning/20 text-warning mb-3">
          🔒
        </div>
        <p className="font-medium mb-3">{message}</p>
        <Link to="/app/profile" className="inline-block px-4 py-2 rounded-md bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-medium">
          Activate now
        </Link>
      </div>
    </div>
  );
}
