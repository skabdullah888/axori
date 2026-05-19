import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Home — Axora" }] }),
  component: Index,
});

function Index() {
  const { isAuthed, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    navigate({ to: isAuthed ? "/app/dashboard" : "/auth/login" });
  }, [isAuthed, loading, navigate]);
  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
}
