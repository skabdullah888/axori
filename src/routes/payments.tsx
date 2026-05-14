import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { fmtDate, StatusPill, EmptyState, fmtMoney, notify } from "@/lib/admin-utils";

export const Route = createFileRoute("/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const load = async () => {
    let q = supabase.from("payments").select("*, profile:profiles(*)").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("pay-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter]);

  const decide = async (row: any, decision: "approved" | "rejected") => {
    const { error } = await supabase.from("payments")
      .update({ status: decision, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }

    if (decision === "approved" && row.profile) {
      const amount = Number(row.amount);
      const delta = row.type === "deposit" ? amount : -amount;
      const newBalance = Number(row.profile.balance ?? 0) + delta;
      await supabase.from("profiles").update({ balance: newBalance }).eq("id", row.user_id);
      await notify(row.user_id, "payment", `${row.type} approved`, `Your ${row.type} of ${fmtMoney(amount)} was approved.`);
      toast.success(`${row.type} approved`);
    } else {
      await notify(row.user_id, "payment", `${row.type} rejected`, `Your ${row.type} request was rejected.`);
      toast.success("Payment rejected");
    }
    load();
  };

  return (
    <AdminShell title="Payments">
      <div className="flex gap-2 mb-4">
        {(["pending", "approved", "rejected", "all"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <EmptyState message="No payment requests." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3">{r.profile?.username ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{r.type}</td>
                    <td className="px-4 py-3">{fmtMoney(r.amount)}</td>
                    <td className="px-4 py-3">{r.method ?? "—"}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" && (
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => decide(r, "rejected")}><X className="h-4 w-4" /></Button>
                          <Button size="sm" onClick={() => decide(r, "approved")}><Check className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>
    </AdminShell>
  );
}
