import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, AlertCircle, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { friendlyError } from "@/lib/friendly-error";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Login — AxoraBD" },
      { name: "description", content: "Log in to your AxoraBD account to complete tasks, track earnings and withdraw via bKash, Nagad or Rocket." },
      { property: "og:title", content: "Login — AxoraBD" },
      { property: "og:description", content: "Sign in to AxoraBD and continue earning online in Bangladesh." },
      { property: "og:url", content: "https://axorabd.site/auth/login" },
    ],
    links: [{ rel: "canonical", href: "https://axorabd.site/auth/login" }],
  }),
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="w-full max-w-md animate-slide-in-right relative">
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
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className="pl-9" placeholder="you@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="p">Password</Label>
              <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="p" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-9 pr-10" placeholder="Your password" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1} aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/15 text-destructive text-sm px-3 py-2 animate-in fade-in slide-in-from-top-1">
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
