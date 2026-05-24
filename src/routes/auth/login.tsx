import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { friendlyError } from "@/lib/friendly-error";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Login — AxoraBD" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthed, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthed) navigate({ to: "/app/dashboard" });
  }, [isAuthed, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError(friendlyError(error)); return; }
    navigate({ to: "/app/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 mb-4 shadow-lg shadow-primary/30">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your AxoraBD account</p>
        </div>
        <form onSubmit={submit} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="space-y-2">
            <Label htmlFor="e">Email</Label>
            <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="p">Password</Label>
              <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Input id="p" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1} aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/15 text-destructive text-sm px-3 py-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground pt-2">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-primary hover:underline font-medium">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
