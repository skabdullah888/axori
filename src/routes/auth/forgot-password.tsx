import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, AlertCircle, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — Earn Hub" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 mb-4 shadow-lg shadow-primary/30">
            {sent ? <MailCheck className="h-7 w-7 text-primary-foreground" /> : <Sparkles className="h-7 w-7 text-primary-foreground" />}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{sent ? "Check your email" : "Forgot password"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sent ? "We sent a reset link to your inbox." : "Enter your email to receive a reset link"}
          </p>
        </div>
        {!sent && (
          <form onSubmit={submit} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="space-y-2">
              <Label htmlFor="e">Email</Label>
              <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/15 text-destructive text-sm px-3 py-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-primary to-primary/80">
              {busy ? "Sending…" : "Send reset link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground pt-2">
              <Link to="/auth/login" className="text-primary hover:underline font-medium">Back to sign in</Link>
            </p>
          </form>
        )}
        {sent && (
          <div className="text-center">
            <Link to="/auth/login"><Button variant="outline">Back to sign in</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
}
