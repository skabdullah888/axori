import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpFromLine, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { UserShell, LockOverlay } from "@/components/user-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/app/withdraw")({
  head: () => ({ meta: [{ title: "Withdraw — Axora" }] }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const { session } = useAuth();
  const { profile, isActive } = useProfile();
  const [settings, setSettings] = useState<any>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({ method: "", receiver_number: "", amount: "" });
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<null | { refs: number; minRefs: number; tasks: number; minTasks: number }>(null);


  const reload = async () => {
    if (!session?.user) return;
    const [s, m, h] = await Promise.all([
      supabase.from("settings").select("*").limit(1).maybeSingle(),
      supabase.from("payment_methods").select("*").eq("active", true),
      supabase.from("payments").select("*").eq("user_id", session.user.id).eq("type", "withdrawal").order("created_at", { ascending: false }),
    ]);
    setSettings(s.data);
    setMethods(m.data ?? []);
    setHistory(h.data ?? []);
  };

  useEffect(() => {
    reload();
    if (!session?.user) return;
    const ch = supabase.channel(`withdraw-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `user_id=eq.${session.user.id}` }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    const savedMethod = (profile as any)?.withdrawal_method;
    const savedAccount = (profile as any)?.withdrawal_account;
    setForm((f) => ({
      ...f,
      method: f.method || savedMethod || "",
      receiver_number: f.receiver_number || savedAccount || "",
    }));
  }, [profile?.id]);

  const minAmt = Number(settings?.minimum_withdrawal ?? 10);
  const feePct = Number(settings?.withdrawal_fee ?? 0);
  const balance = Number(profile?.balance ?? 0);
  const amt = Number(form.amount || 0);
  const feeAmt = +(amt * feePct / 100).toFixed(2);
  const willReceive = Math.max(0, amt - feeAmt);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    if (amt < minAmt) { toast.error(`Minimum withdrawal is ৳${minAmt.toFixed(2)}`); return; }
    if (amt > balance) { toast.error("Insufficient balance"); return; }
    const minRefs = Number((settings as any)?.minimum_referrals_for_withdrawal ?? 0);
    if (minRefs > 0) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", session.user.id);
      if ((count ?? 0) < minRefs) {
        toast.error(`You need at least ${minRefs} referral${minRefs > 1 ? "s" : ""} to withdraw.`);
        return;
      }
    }
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      user_id: session.user.id,
      type: "withdrawal",
      method: form.method,
      receiver_number: form.receiver_number,
      amount: amt,
      status: "pending",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawal request submitted.");
    setForm({ method: "", receiver_number: "", amount: "" });
  };

  return (
    <UserShell title="Withdraw">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ArrowUpFromLine className="h-5 w-5 text-primary" /> Request withdrawal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-gradient-to-br from-primary/15 to-transparent border border-primary/30 p-4 mb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Available balance</p>
              <p className="text-3xl font-bold">৳{balance.toFixed(2)}</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Payout method</Label>
                {methods.length > 0 ? (
                  <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => (<SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="e.g. bKash, USDT, PayPal…" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} required />
                )}
              </div>
              <div className="space-y-2">
                <Label>Your receiving account / address</Label>
                <Input value={form.receiver_number} onChange={(e) => setForm((f) => ({ ...f, receiver_number: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
                <Input type="number" step="0.01" min={minAmt} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Min: ৳{minAmt.toFixed(2)} · Fee: {feePct}% (৳{feeAmt.toFixed(2)})</span>
                  <span>You receive: <span className="font-semibold text-foreground">৳{willReceive.toFixed(2)}</span></span>
                </div>
              </div>

              {!isActive && (
                <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  Activate your account to withdraw.
                </div>
              )}

              <Button type="submit" disabled={busy || !isActive} className="w-full bg-gradient-to-r from-primary to-primary/80">
                {busy ? "Submitting…" : "Submit withdrawal"}
              </Button>
            </form>
            {!isActive && <LockOverlay message="Account activation required to withdraw funds." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent withdrawals</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No withdrawals yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/40">
                    <div className="min-w-0">
                      <p className="font-semibold">৳{Number(p.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.method} → {p.receiver_number}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className={
                      p.status === "approved" || p.status === "completed" ? "bg-success/20 text-success border-success/30"
                      : p.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30"
                      : "bg-warning/20 text-warning border-warning/30"
                    }>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserShell>
  );
}
