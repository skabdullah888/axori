import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { isAuthed, loading, session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!isAuthed) { navigate({ to: "/auth/login" }); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session!.user.id).eq("role", "admin").maybeSingle();
      navigate({ to: data ? "/dashboard" : "/app/dashboard" });
    })();
  }, [isAuthed, loading, navigate, session]);
  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
}
