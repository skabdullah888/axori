import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
  validateSearch: (s: Record<string, unknown>) => ({ ref: (s.ref as string) || "" }),
});

const schema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  phone: z.string().trim().min(6).max(20),
  password: z.string().min(6).max(72),
  referral_code: z.string().trim().max(16).optional().or(z.literal("")),
});

function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthed, loading } = useAuth();
  const { ref } = useSearch({ from: "/auth/register" });
  const [form, setForm] = useState({ username: "", email: "", phone: "", password: "", referral_code: ref || "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthed) navigate({ to: "/app/dashboard" });
  }, [isAuthed, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const data = schema.parse(form);
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/dashboard`,
          data: { username: data.username, phone: data.phone, referral_code: data.referral_code || null },
        },
      });
      if (error) throw error;
      navigate({ to: "/app/dashboard" });
    } catch (e: any) {
      setError(e?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 mb-4 shadow-lg shadow-primary/30">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Join Axora</h1>
          <p className="text-sm text-muted-foreground mt-1">Earn by completing tasks</p>
        </div>
        <form onSubmit={submit} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 space-y-3 shadow-2xl">
          <div className="space-y-2">
            <Label htmlFor="u">Username</Label>
            <Input id="u" value={form.username} onChange={upd("username")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e">Email</Label>
            <Input id="e" type="email" value={form.email} onChange={upd("email")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph">Phone</Label>
            <Input id="ph" value={form.phone} onChange={upd("phone")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p">Password</Label>
            <Input id="p" type="password" value={form.password} onChange={upd("password")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r">Referral code <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="r" value={form.referral_code} onChange={upd("referral_code")} />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/15 text-destructive text-sm px-3 py-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90">
            {busy ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground pt-1">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
