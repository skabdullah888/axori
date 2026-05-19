import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, AlertCircle, Eye, EyeOff, MailCheck } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/register")({
  head: () => ({ meta: [{ title: "Register — Earn Hub" }] }),
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
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && isAuthed) navigate({ to: "/app/dashboard" });
  }, [isAuthed, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const data = schema.parse(form);

      // Pre-check duplicates against profiles (username/email/phone)
      const { data: dupes } = await supabase
        .from("profiles")
        .select("username,email,phone")
        .or(
          `username.ilike.${data.username},email.ilike.${data.email},phone.eq.${data.phone}`,
        );
      if (dupes && dupes.length > 0) {
        const d = dupes[0] as { username: string; email: string | null; phone: string | null };
        if (d.username?.toLowerCase() === data.username.toLowerCase()) throw new Error("This username is already taken");
        if (d.email?.toLowerCase() === data.email.toLowerCase()) throw new Error("An account with this email already exists");
        if (d.phone === data.phone) throw new Error("An account with this phone number already exists");
        throw new Error("An account with these details already exists");
      }

      const { data: res, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/dashboard`,
          data: { username: data.username, phone: data.phone, referral_code: data.referral_code || null },
        },
      });
      if (error) throw error;
      if (!res.session) {
        setSent(true);
      } else {
        navigate({ to: "/app/dashboard" });
      }
    } catch (e: any) {
      const msg = e?.message ?? "Sign up failed";
      // Translate DB unique-violation if it slips through
      if (/profiles_username_unique/i.test(msg)) setError("This username is already taken");
      else if (/profiles_email_unique/i.test(msg) || /already registered/i.test(msg)) setError("An account with this email already exists");
      else if (/profiles_phone_unique/i.test(msg)) setError("An account with this phone number already exists");
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 text-center shadow-2xl">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 mb-4 shadow-lg shadow-primary/30">
            <MailCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
          <p className="text-sm text-muted-foreground mt-2">
            We sent a verification link to <span className="font-medium text-foreground">{form.email}</span>. Click the link to activate your account, then sign in.
          </p>
          <Link to="/auth/login" className="inline-block mt-6">
            <Button className="bg-gradient-to-r from-primary to-primary/80">Go to sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

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
            <div className="relative">
              <Input id="p" type={showPw ? "text" : "password"} value={form.password} onChange={upd("password")} required className="pr-10" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1} aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
