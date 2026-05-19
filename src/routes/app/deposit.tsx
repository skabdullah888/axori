import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserShell } from "@/components/user-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/deposit")({ component: DepositPage });

function DepositPage() {
  const { session } = useAuth();
  const [methods, setMethods] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({ method: "", sender_number: "", trnx_id: "", amount: "" });
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!session?.user) return;
    const [m, h] = await Promise.all([
      supabase.from("payment_methods").select("*").eq("active", true),
      supabase.from("payments").select("*").eq("user_id", session.user.id).eq("type", "deposit").order("created_at", { ascending: false }),
    ]);
    setMethods(m.data ?? []);
    setHistory(h.data ?? []);
  };

  useEffect(() => {
    reload();
    if (!session?.user) return;
    const ch = supabase.channel(`deposit-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `user_id=eq.${session.user.id}` }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const selected = methods.find((m) => m.id === form.method);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !selected) return;
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      user_id: session.user.id,
      type: "deposit",
      method: selected.name,
      sender_number: form.sender_number,
      receiver_number: selected.receiver_number,
      trnx_id: form.trnx_id,
      amount: amt,
      status: "pending",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deposit request submitted. Admin will review shortly.");
    setForm({ method: "", sender_number: "", trnx_id: "", amount: "" });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <UserShell title="Deposit">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-primary" /> Add funds</CardTitle>
          </CardHeader>
          <CardContent>
            {methods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment methods available right now. Please check back later.</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                {selected && (
                  <div className="rounded-lg bg-accent/40 border border-border p-3 space-y-2 text-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Send funds to</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold">{selected.receiver_number}</span>
                      <button type="button" onClick={() => copy(selected.receiver_number)} className="text-primary hover:opacity-80">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    {selected.instructions && <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">{selected.instructions}</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Sender number</Label>
                    <Input value={form.sender_number} onChange={(e) => setForm((f) => ({ ...f, sender_number: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input value={form.trnx_id} onChange={(e) => setForm((f) => ({ ...f, trnx_id: e.target.value }))} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <Input type="number" step="0.01" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
                </div>
                <Button type="submit" disabled={busy || !form.method} className="w-full bg-gradient-to-r from-primary to-primary/80">
                  {busy ? "Submitting…" : "Submit deposit request"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent deposits</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No deposits yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/40">
                    <div className="min-w-0">
                      <p className="font-semibold">${Number(p.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.method} · {new Date(p.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className={
                      p.status === "approved" ? "bg-success/20 text-success border-success/30"
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
