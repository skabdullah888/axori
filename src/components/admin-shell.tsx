import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const { isAuthed, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthed) navigate({ to: "/sk-control-panel-99" });
  }, [loading, isAuthed, navigate]);

  if (loading || !isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <div className="ml-60">
        <header className="h-14 border-b border-border bg-card/40 backdrop-blur flex items-center px-6 sticky top-0 z-20">
          <h1 className="text-base font-semibold">{title}</h1>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
