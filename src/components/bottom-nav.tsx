import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ListTodo, Wallet, Bell, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/app/tasks", label: "Tasks", icon: ListTodo },
  { to: "/app/wallet", label: "Wallet", icon: Wallet },
  { to: "/app/notifications", label: "Alerts", icon: Bell },
] as const;

export function BottomNav({ unread = 0 }: { unread?: number }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const activeIndex = navItems.findIndex((i) => path === i.to || path.startsWith(i.to + "/"));
  const safeIndex = activeIndex === -1 ? 0 : activeIndex;
  const indicatorLeft = `calc(${safeIndex} * 25% + 12.5% - 18px)`;

  const haptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { (navigator as any).vibrate?.(8); } catch { /* noop */ }
    }
  };

  return (
    <>
      {/* Floating action button — Publish a task */}
      <Link
        to="/app/publish"
        onClick={haptic}
        className="lg:hidden fixed z-40 bottom-20 right-4 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/40 active:scale-95 transition-transform"
        aria-label="Publish task"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <nav
        className={cn(
          "lg:hidden fixed bottom-0 inset-x-0 z-30 h-16",
          "bg-card/90 backdrop-blur-xl border-t border-border",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        <div className="relative h-full grid grid-cols-4">
          {/* sliding indicator */}
          <span
            aria-hidden
            className="absolute top-1 h-1 w-9 rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 ease-out"
            style={{ left: indicatorLeft }}
          />
          {navItems.map((it, idx) => {
            const Icon = it.icon;
            const active = idx === safeIndex;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={haptic}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all active:scale-95",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-5 w-5 transition-transform", active && "-translate-y-0.5")} />
                  {it.to === "/app/notifications" && unread > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
