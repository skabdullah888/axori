import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, ShieldCheck, Sparkles, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserShell } from "@/components/user-shell";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { session } = useAuth();
  const { profile, isActive, reload } = useProfile();
  const [methods, setMethods] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [pendingActivation, setPendingActivation] = useState<any>(null);
  const [form, setForm] = useState({ sender_number: "", method: "", trnx_id: "", amount: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [pm, s] = await Promise.all([
        supabase.from("payment_methods").select("*").eq("active", true),
        supabase.from("settings").select("*").limit(1).maybeSingle(),
      ]);
      setMethods(pm.data ?? []);
      setSettings(s.data);
      if (s.data?.activation_amount) setForm((f) => ({ ...f, amount: String(s.data!.activation_amount) }));
    })();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data } = await supabase.from("payments")
        .select("*").eq("user_id", session.user.id).eq("type", "activation")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      setPendingActivation(data);
    })();
  }, [session?.user?.id, profile?.last_activation_request_at]);

  const cooldownHours = (() => {
    if (!profile?.last_activation_request_at) return 0;
    const diff = Date.now() - new Date(profile.last_activation_request_at).getTime();
    const remaining = 24 - diff / (1000 * 60 * 60);
    return Math.max(0, remaining);
  })();

  const submitActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !profile) return;
    if (cooldownHours > 0 && pendingActivation?.status === "rejected") {
      toast.error(`Please wait ${cooldownHours.toFixed(1)}h before resubmitting.`);
      return;
    }
    setBusy(true);
    const selectedMethod = methods.find((m) => m.id === form.method);
    const { error } = await supabase.from("payments").insert({
      user_id: session.user.id,
      type: "activation",
      method: selectedMethod?.name,
      sender_number: form.sender_number,
      receiver_number: selectedMethod?.receiver_number,
      trnx_id: form.trnx_id,
      amount: Number(form.amount),
      status: "pending",
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    await supabase.from("profiles").update({ last_activation_request_at: new Date().toISOString() })
      .eq("user_id", session.user.id);
    toast.success("Activation request submitted. Admin will review shortly.");
    setBusy(false);
    reload();
  };

  return (
    <UserShell title="Profile">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6 text-center">
            <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-xl shadow-primary/30">
              {profile?.username?.[0]?.toUpperCase() ?? "U"}
            </div>
            <h2 className="mt-4 text-xl font-bold">{profile?.username}</h2>
            <Badge variant="outline" className={`mt-2 ${isActive ? "border-success/40 text-success" : "border-warning/40 text-warning"}`}>
              {isActive ? "✓ Active" : "⚠ Inactive"}
            </Badge>
            <div className="mt-6 space-y-2 text-left text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {profile?.email ?? "—"}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {profile?.phone ?? "—"}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4" /> Trust: {profile?.trust_score ?? 100}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" /> Ref: {profile?.referral_code ?? "—"}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account Activation</CardTitle>
          </CardHeader>
          <CardContent>
            {isActive ? (
              <div className="rounded-xl bg-success/10 border border-success/30 p-6 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success mb-3">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <p className="font-semibold text-success">Your account is activated successfully</p>
                <p className="text-sm text-muted-foreground mt-1">All features unlocked.</p>
              </div>
            ) : (
              <>
                {pendingActivation?.status === "pending" && (
                  <div className="mb-4 rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    Your activation is pending admin approval.
                  </div>
                )}

                {methods.length > 0 && (
                  <div className="mb-4 p-4 rounded-lg bg-accent/40 border border-border space-y-2 text-sm">
                    <p className="font-semibold mb-1">💳 Send ${settings?.activation_amount ?? 5} to:</p>
                    {methods.map((m) => (
                      <div key={m.id} className="flex justify-between border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">{m.name}</span>
                        <span className="font-mono font-semibold">{m.receiver_number}</span>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={submitActivation} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>
                        {methods.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Sender Number</Label>
                      <Input value={form.sender_number} onChange={(e) => setForm((f) => ({ ...f, sender_number: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Transaction ID</Label>
                      <Input value={form.trnx_id} onChange={(e) => setForm((f) => ({ ...f, trnx_id: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (USD)</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
                  </div>
                  <Button type="submit" disabled={busy || !form.method} className="w-full bg-gradient-to-r from-primary to-primary/80">
                    {busy ? "Submitting…" : "Submit activation request"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </UserShell>
  );
}
