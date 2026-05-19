import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — Axora" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase recovery link sets session via hash; wait for auth state
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => navigate({ to: "/auth/login" }), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 mb-4 shadow-lg shadow-primary/30">
            {done ? <CheckCircle2 className="h-7 w-7 text-primary-foreground" /> : <Sparkles className="h-7 w-7 text-primary-foreground" />}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{done ? "Password updated" : "Set new password"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{done ? "Redirecting to sign in…" : "Choose a strong password"}</p>
        </div>
        {!done && (
          <form onSubmit={submit} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
            {!ready && (
              <div className="text-sm text-muted-foreground text-center">
                Verifying reset link…
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="p">New password</Label>
              <div className="relative">
                <Input id="p" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c">Confirm password</Label>
              <Input id="c" type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/15 text-destructive text-sm px-3 py-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            <Button type="submit" disabled={busy || !ready} className="w-full bg-gradient-to-r from-primary to-primary/80">
              {busy ? "Updating…" : "Update password"}
            </Button>
            <p className="text-center text-sm text-muted-foreground pt-2">
              <Link to="/auth/login" className="text-primary hover:underline font-medium">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
