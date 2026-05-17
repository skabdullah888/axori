import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { fmtDate, StatusPill, EmptyState, fmtMoney, notify } from "@/lib/admin-utils";
import { RejectDialog, ConfirmDialog } from "@/components/reject-dialog";

export const Route = createFileRoute("/payments")({ component: PaymentsPage });

type Filter = "all" | "pending" | "approved" | "rejected";

const DEPOSIT_REJECT_PRESETS = [
  "Invalid transaction ID",
  "Amount mismatch",
  "Duplicate request",
  "Sender number not verified",
  "Suspicious activity",
];
const WITHDRAWAL_REJECT_PRESETS = [
  "Insufficient balance",
  "Receiver number invalid",
  "Account flagged for review",
  "Below minimum withdrawal",
  "Suspicious activity",
];

function PaymentsPage() {
  return (
    <AdminShell title="Payments">
      <Tabs defaultValue="deposit">
        <TabsList>
          <TabsTrigger value="deposit">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="deposit"><PaymentsTable type="deposit" /></TabsContent>
        <TabsContent value="withdrawal"><PaymentsTable type="withdrawal" /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function PaymentsTable({ type }: { type: "deposit" | "withdrawal" }) {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [approveRow, setApproveRow] = useState<any | null>(null);
  const [rejectRow, setRejectRow] = useState<any | null>(null);

  const load = async () => {
    let q = supabase.from("payments")
      .select("*, profile:profiles(*)")
      .eq("type", type)
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`pay-rt-${type}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter, type]);

  const doApprove = async (row: any) => {
    const { error } = await supabase.from("payments")
      .update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    if (row.profile) {
      const amount = Number(row.amount);
      const delta = type === "deposit" ? amount : -amount;
      const newBalance = Number(row.profile.balance ?? 0) + delta;
      await supabase.from("profiles").update({ balance: newBalance }).eq("id", row.user_id);
    }
    await notify(
      row.user_id, "payment",
      `${type === "deposit" ? "Deposit" : "Withdrawal"} approved`,
      `Your ${type} request of ${fmtMoney(row.amount)} has been approved and processed.`,
    );
    toast.success(`${type} approved`);
    setApproveRow(null); load();
  };

  const doReject = async (row: any, reason: string) => {
    const { error } = await supabase.from("payments")
      .update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    await notify(
      row.user_id, "payment",
      `${type === "deposit" ? "Deposit" : "Withdrawal"} rejected`,
      `Your ${type} request of ${fmtMoney(row.amount)} was rejected. Reason: ${reason}`,
    );
    toast.success(`${type} rejected`);
    setRejectRow(null); load();
  };

  return (
    <div className="mt-4">
      <div className="flex gap-2 mb-4">
        {(["all", "pending", "approved", "rejected"] as Filter[]).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)}>
            {f === "all" ? "All Requests" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <EmptyState message={`No ${type} requests.`} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">User</th>
                  {type === "deposit" ? (
                    <>
                      <th className="text-left px-4 py-3">Sender Number</th>
                      <th className="text-left px-4 py-3">Method</th>
                      <th className="text-left px-4 py-3">Trnx ID</th>
                    </>
                  ) : (
                    <th className="text-left px-4 py-3">Receiver Number</th>
                  )}
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Date & Time</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3">{r.profile?.username ?? "—"}</td>
                    {type === "deposit" ? (
                      <>
                        <td className="px-4 py-3 font-mono text-xs">{r.sender_number ?? "—"}</td>
                        <td className="px-4 py-3 capitalize">{r.method ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.trnx_id ?? r.reference ?? "—"}</td>
                      </>
                    ) : (
                      <td className="px-4 py-3 font-mono text-xs">{r.receiver_number ?? "—"}</td>
                    )}
                    <td className="px-4 py-3 font-medium">{fmtMoney(r.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" && (
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => setRejectRow(r)}><X className="h-4 w-4" /></Button>
                          <Button size="sm" onClick={() => setApproveRow(r)}><Check className="h-4 w-4" /></Button>
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

      <ConfirmDialog
        open={!!approveRow}
        title={`Approve ${type}?`}
        description={approveRow ? `${fmtMoney(approveRow.amount)} will be ${type === "deposit" ? "added to" : "deducted from"} ${approveRow.profile?.username}'s balance, and they will be notified.` : ""}
        confirmLabel="Approve"
        onCancel={() => setApproveRow(null)}
        onConfirm={() => approveRow && doApprove(approveRow)}
      />
      <RejectDialog
        open={!!rejectRow}
        title={`Reject ${type}?`}
        description="Select a reason or write a custom message. The user will be notified."
        presets={type === "deposit" ? DEPOSIT_REJECT_PRESETS : WITHDRAWAL_REJECT_PRESETS}
        onCancel={() => setRejectRow(null)}
        onConfirm={(reason) => rejectRow && doReject(rejectRow, reason)}
      />
    </div>
  );
}
