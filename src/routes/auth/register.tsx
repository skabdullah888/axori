import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Sparkles, AlertCircle, Eye, EyeOff, MailCheck, User, Mail, Phone, Lock, Gift, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Sign Up — AxoraBD" },
      { name: "description", content: "Create your free AxoraBD account in seconds and start earning online in Bangladesh by completing simple micro-tasks." },
      { property: "og:title", content: "Sign Up — AxoraBD" },
      { property: "og:description", content: "Join AxoraBD free and start earning with micro-tasks today." },
      { property: "og:url", content: "https://axorabd.site/auth/register" },
    ],
    links: [{ rel: "canonical", href: "https://axorabd.site/auth/register" }],
  }),
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

const steps = [
  { key: "account", title: "Choose a username", subtitle: "This is how others will see you", icon: User },
  { key: "contact", title: "Your contact details", subtitle: "We'll use these to keep your account safe", icon: Mail },
  { key: "security", title: "Secure your account", subtitle: "Pick a strong password to finish", icon: Lock },
] as const;

function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthed, loading } = useAuth();
  const { ref } = useSearch({ from: "/auth/register" });
  const [form, setForm] = useState({ username: "", email: "", phone: "", password: "", referral_code: ref || "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    if (!loading && isAuthed) navigate({ to: "/app/dashboard" });
  }, [isAuthed, loading, navigate]);

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (form.username.trim().length < 3) return "Username must be at least 3 characters";
      if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return "Only letters, numbers and _ allowed";
    }
    if (s === 1) {
      if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address";
      if (form.phone.trim().length < 6) return "Enter a valid phone number";
    }
    if (s === 2) {
      if (form.password.length < 6) return "Password must be at least 6 characters";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setDir(1);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const back = () => {
    setError("");
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(2);
    if (err) { setError(err); return; }
    setError(""); setBusy(true);
    try {
      const data = schema.parse(form);

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

      let signupIp: string | null = null;
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        if (typeof ipJson?.ip === "string") signupIp = ipJson.ip;
      } catch {}

      const { data: res, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/dashboard`,
          data: { username: data.username, phone: data.phone, referral_code: data.referral_code || null, signup_ip: signupIp },
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
      if (/profiles_username_unique/i.test(msg)) { setError("This username is already taken"); setStep(0); }
      else if (/profiles_email_unique/i.test(msg) || /already registered/i.test(msg)) { setError("An account with this email already exists"); setStep(1); }
      else if (/profiles_phone_unique/i.test(msg)) { setError("An account with this phone number already exists"); setStep(1); }
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-500">
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

  const StepIcon = steps[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 mb-4 shadow-lg shadow-primary/30">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Join AxoraBD</h1>
          <p className="text-sm text-muted-foreground mt-1">Earn by completing tasks</p>
        </div>

        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl">
          {/* Step indicator */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              {steps.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <div key={s.key} className="flex items-center flex-1 last:flex-none">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-all duration-300 ${
                        done
                          ? "bg-primary text-primary-foreground border-primary"
                          : active
                          ? "bg-primary/20 text-primary border-primary scale-110 shadow-lg shadow-primary/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="flex-1 h-0.5 mx-1 bg-border overflow-hidden rounded">
                        <div
                          className={`h-full bg-primary transition-all duration-500 ${i < step ? "w-full" : "w-0"}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <form onSubmit={submit}>
            {/* Sliding viewport */}
            <div className="relative overflow-hidden">
              <div
                key={step}
                className={dir === 1 ? "animate-slide-in-right" : "animate-slide-in-left"}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">{steps[step].title}</div>
                    <div className="text-xs text-muted-foreground">{steps[step].subtitle}</div>
                  </div>
                </div>

                {step === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="u">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="u" value={form.username} onChange={upd("username")} autoFocus className="pl-9" placeholder="your_username" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="r">Referral code <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <div className="relative">
                        <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="r" value={form.referral_code} onChange={upd("referral_code")} className="pl-9" placeholder="Friend's code" />
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="e">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="e" type="email" value={form.email} onChange={upd("email")} autoFocus className="pl-9" placeholder="you@example.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ph">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="ph" value={form.phone} onChange={upd("phone")} className="pl-9" placeholder="01XXXXXXXXX" />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="p">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="p" type={showPw ? "text" : "password"} value={form.password} onChange={upd("password")} autoFocus className="pl-9 pr-10" placeholder="At least 6 characters" />
                        <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1} aria-label={showPw ? "Hide password" : "Show password"}>
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-1">
                      <div className="font-semibold text-foreground">Almost done!</div>
                      <div className="text-muted-foreground">Signed up as <span className="font-medium text-foreground">{form.username}</span> · {form.email}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/15 text-destructive text-sm px-3 py-2 mt-4 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={back} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button type="button" onClick={next} className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90">
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={busy} className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90">
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground pt-4">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
