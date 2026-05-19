import { useEffect, useMemo, useState } from "react";
import { Paginator } from "@/components/paginator";
const PAGE_SIZE = 25;
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";
import { fmtDate, StatusPill, EmptyState, fmtMoney, notify } from "@/lib/admin-utils";
import { RejectDialog, ConfirmDialog } from "@/components/reject-dialog";

export const Route = createFileRoute("/skabdullah_999_sg/admin/payments")({
  head: () => ({ meta: [{ title: "Admin Payments — Axora" }] }),
  component: PaymentsPage,
});

type Filter = "all" | "pending" | "approved" | "rejected";
type PayType = "deposit" | "withdrawal" | "activation";

const DEPOSIT_REJECT_PRESETS = [
  "Invalid transaction ID", "Amount mismatch", "Duplicate request",
  "Sender number not verified", "Suspicious activity",
];
const WITHDRAWAL_REJECT_PRESETS = [
  "Insufficient balance", "Receiver number invalid", "Account flagged for review",
  "Below minimum withdrawal", "Suspicious activity",
];
const ACTIVATION_REJECT_PRESETS = [
  "Invalid transaction ID", "Amount mismatch", "Payment not received",
  "Duplicate activation request", "Sender number not verified", "Suspicious activity",
];

function PaymentsPage() {
  return (
    <AdminShell title="Payments">
      <Tabs defaultValue="activation">
        <TabsList>
          <TabsTrigger value="activation">Activations</TabsTrigger>
          <TabsTrigger value="deposit">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="activation"><PaymentsTable type="activation" /></TabsContent>
        <TabsContent value="deposit"><PaymentsTable type="deposit" /></TabsContent>
        <TabsContent value="withdrawal"><PaymentsTable type="withdrawal" /></TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function PaymentsTable({ type }: { type: PayType }) {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [approveRow, setApproveRow] = useState<any | null>(null);
  const [rejectRow, setRejectRow] = useState<any | null>(null);
  const [viewRow, setViewRow] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filter]);
  const paged = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);


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
    // eslint-disable-next-line
  }, [filter, type]);

  const clearAdminNotifs = async (row: any) => {
    const uname = row.profile?.username;
    if (!uname) return;
    await supabase.from("notifications")
      .delete()
      .eq("admin_targeted", true)
      .eq("type", `${type}_request`)
      .ilike("message", `%${uname}%`);
  };

  const doApprove = async (row: any) => {
    const { error } = await supabase.from("payments")
      .update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    await clearAdminNotifs(row);

    if (type === "activation") {
      // Activate account
      await supabase.from("profiles").update({
        status: "active",
        activated_at: new Date().toISOString(),
      }).eq("user_id", row.user_id);

      // Credit referrer bonus if any
      if (row.profile?.referred_by) {
        const { data: settings } = await supabase.from("settings")
          .select("referral_bonus").limit(1).maybeSingle();
        const bonus = Number(settings?.referral_bonus ?? 0);
        if (bonus > 0) {
          const { data: refProfile } = await supabase.from("profiles")
            .select("id,balance,user_id").eq("user_id", row.profile.referred_by).maybeSingle();
          if (refProfile) {
            await supabase.from("profiles")
              .update({ balance: Number(refProfile.balance ?? 0) + bonus })
              .eq("id", refProfile.id);
            await supabase.from("referral_earnings").insert({
              referrer_id: row.profile.referred_by,
              referred_id: row.user_id,
              amount: bonus,
              status: "approved",
            });
            await notify(row.profile.referred_by, "referral",
              "Referral bonus earned",
              `You earned ${fmtMoney(bonus)} for referring @${row.profile.username}.`);
          }
        }
      }
    } else if (row.profile) {
      const amount = Number(row.amount);
      const delta = type === "deposit" ? amount : -amount;
      const newBalance = Number(row.profile.balance ?? 0) + delta;
      await supabase.from("profiles").update({ balance: newBalance }).eq("user_id", row.user_id);
    }

    const title = type === "activation" ? "Account activated"
      : `${type === "deposit" ? "Deposit" : "Withdrawal"} approved`;
    const msg = type === "activation"
      ? `Your activation payment of ${fmtMoney(row.amount)} has been verified. Your account is now active!`
      : `Your ${type} request of ${fmtMoney(row.amount)} has been approved and processed.`;
    await notify(row.user_id, "payment", title, msg);

    toast.success(`${type} approved`);
    setApproveRow(null); setViewRow(null); load();
  };

  const doReject = async (row: any, reason: string) => {
    const { error } = await supabase.from("payments")
      .update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    await clearAdminNotifs(row);
    await notify(
      row.user_id, "payment",
      `${type === "activation" ? "Activation" : type === "deposit" ? "Deposit" : "Withdrawal"} rejected`,
      `Your ${type} request of ${fmtMoney(row.amount)} was rejected. Reason: ${reason}`,
    );
    toast.success(`${type} rejected`);
    setRejectRow(null); setViewRow(null); load();
  };

  const presets = type === "deposit" ? DEPOSIT_REJECT_PRESETS
    : type === "withdrawal" ? WITHDRAWAL_REJECT_PRESETS
    : ACTIVATION_REJECT_PRESETS;

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
                  {type === "withdrawal" ? (
                    <th className="text-left px-4 py-3">Receiver Number</th>
                  ) : (
                    <>
                      <th className="text-left px-4 py-3">Sender Number</th>
                      <th className="text-left px-4 py-3">Method</th>
                      <th className="text-left px-4 py-3">Trnx ID</th>
                    </>
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
                    {type === "withdrawal" ? (
                      <td className="px-4 py-3 font-mono text-xs">{r.receiver_number ?? "—"}</td>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono text-xs">{r.sender_number ?? "—"}</td>
                        <td className="px-4 py-3 capitalize">{r.method ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.trnx_id ?? r.reference ?? "—"}</td>
                      </>
                    )}
                    <td className="px-4 py-3 font-medium">{fmtMoney(r.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewRow(r)}><Eye className="h-4 w-4" /></Button>
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" variant="destructive" onClick={() => setRejectRow(r)}><X className="h-4 w-4" /></Button>
                            <Button size="sm" onClick={() => setApproveRow(r)}><Check className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>

      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">{type} request details</DialogTitle>
          </DialogHeader>
          {viewRow && (
            <div className="space-y-3 text-sm">
              <Detail label="User" value={viewRow.profile?.username ?? "—"} />
              <Detail label="Email" value={viewRow.profile?.email ?? "—"} />
              <Detail label="Phone" value={viewRow.profile?.phone ?? "—"} />
              <Detail label="Account status" value={viewRow.profile?.status ?? "—"} />
              <Detail label="Amount" value={fmtMoney(viewRow.amount)} />
              <Detail label="Payment method" value={viewRow.method ?? "—"} />
              {type !== "withdrawal" && (
                <>
                  <Detail label="Sender number" value={viewRow.sender_number ?? "—"} mono />
                  <Detail label="Transaction ID" value={viewRow.trnx_id ?? viewRow.reference ?? "—"} mono />
                </>
              )}
              <Detail label="Receiver number" value={viewRow.receiver_number ?? "—"} mono />
              <Detail label="Requested at" value={fmtDate(viewRow.created_at)} />
              <Detail label="Status" value={<StatusPill status={viewRow.status} />} />
              {viewRow.status === "pending" && (
                <div className="flex gap-2 justify-end pt-3 border-t border-border">
                  <Button variant="destructive" onClick={() => { setRejectRow(viewRow); }}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button onClick={() => { setApproveRow(viewRow); }}>
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!approveRow}
        title={`Approve ${type}?`}
        description={approveRow ? (
          type === "activation"
            ? `${approveRow.profile?.username}'s account will be activated and they will be notified.`
            : `${fmtMoney(approveRow.amount)} will be ${type === "deposit" ? "added to" : "deducted from"} ${approveRow.profile?.username}'s balance, and they will be notified.`
        ) : ""}
        confirmLabel="Approve"
        onCancel={() => setApproveRow(null)}
        onConfirm={() => approveRow && doApprove(approveRow)}
      />
      <RejectDialog
        open={!!rejectRow}
        title={`Reject ${type}?`}
        description="Select a reason or write a custom message. The user will be notified."
        presets={presets}
        onCancel={() => setRejectRow(null)}
        onConfirm={(reason) => rejectRow && doReject(rejectRow, reason)}
      />
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</span>
    </div>
  );
}
