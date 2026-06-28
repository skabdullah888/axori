import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "./admin-sidebar";
import { FullPageLoader } from "@/components/section-loader";

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const { isAuthed, loading, session } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthed) {
      navigate({ to: "/skabdullah_999_sg/admin/login" });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session!.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) {
        await supabase.auth.signOut();
        navigate({ to: "/skabdullah_999_sg/admin/login" });
        return;
      }
      setIsAdmin(true);
      setChecked(true);
    })();
  }, [loading, isAuthed, navigate, session]);

  if (loading || !checked || !isAdmin) {
    return <FullPageLoader label="Verifying admin access" />;
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
