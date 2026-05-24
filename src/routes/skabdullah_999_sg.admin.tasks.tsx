import { useEffect, useMemo, useState } from "react";
import { Paginator } from "@/components/paginator";
const PAGE_SIZE = 25;
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";
import { fmtDate, StatusPill, EmptyState, fmtMoney, notify } from "@/lib/admin-utils";
import { ConfirmDialog, RejectDialog } from "@/components/reject-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { friendlyError } from "@/lib/friendly-error";

export const Route = createFileRoute("/skabdullah_999_sg/admin/tasks")({
  head: () => ({ meta: [{ title: "Admin Tasks — AxoraBD" }] }),
  component: TasksPage,
});

const TASK_REJECT_PRESETS = [
  "Violates platform rules",
  "Incomplete description",
  "Reward too low",
  "Duplicate task",
  "Spam or low quality",
];

type Filter = "all" | "pending" | "active" | "rejected" | "completed" | "paused";

function TasksPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [approveRow, setApproveRow] = useState<any | null>(null);
  const [rejectRow, setRejectRow] = useState<any | null>(null);
  const [viewRow, setViewRow] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filter]);
  const paged = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);



  const load = async () => {
    let q = supabase.from("tasks")
      .select("*, publisher:profiles(*)").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("tasks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter]);

  const doApprove = async (row: any) => {
    const { error } = await supabase.from("tasks").update({ status: "active" }).eq("id", row.id);
    if (error) { toast.error(friendlyError(error)); return; }
    await notify(row.publisher_id, "system", "Task approved", `Your task "${row.title}" has been approved and is now live.`);
    toast.success("Task approved");
    setApproveRow(null);
  };

  const doReject = async (row: any, reason: string) => {
    const { error } = await supabase.rpc("admin_reject_task_with_refund", { p_task_id: row.id, p_reason: reason });
    if (error) { toast.error(friendlyError(error)); return; }
    await notify(row.publisher_id, "system", "Task rejected & refunded", `Your task "${row.title}" was rejected. Reason: ${reason}. The held amount has been refunded to your balance.`);
    toast.success("Task rejected & publisher refunded");
    setRejectRow(null);
  };

  return (
    <AdminShell title="Tasks Overview">
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["pending", "active", "rejected", "completed", "paused", "all"] as Filter[]).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <EmptyState message="No tasks." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Publisher</th>
                  <th className="text-left px-4 py-3">Reward</th>
                  <th className="text-left px-4 py-3">Slots</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">{r.title}</td>
                    <td className="px-4 py-3">{r.publisher?.username ?? "—"}</td>
                    <td className="px-4 py-3">{fmtMoney(r.reward)}</td>
                    <td className="px-4 py-3">{r.completed_slots} / {r.total_slots}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewRow(r)}><Eye className="h-4 w-4 mr-1" />View</Button>
                        {r.status === "pending" && (
                          <Button size="sm" onClick={() => setApproveRow(r)}><Check className="h-4 w-4 mr-1" />Accept</Button>
                        )}
                        {["pending","active","paused"].includes(r.status) && (
                          <Button size="sm" variant="destructive" onClick={() => setRejectRow(r)}><X className="h-4 w-4 mr-1" />Reject</Button>
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
      <Paginator page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />


      <ConfirmDialog
        open={!!approveRow}
        title="Accept task?"
        description={approveRow ? `Task "${approveRow.title}" will go live and the publisher will be notified.` : ""}
        confirmLabel="Accept"
        onCancel={() => setApproveRow(null)}
        onConfirm={() => approveRow && doApprove(approveRow)}
      />
      <RejectDialog
        open={!!rejectRow}
        title="Reject task?"
        description="Select a reason or write a custom message. The publisher will be notified."
        presets={TASK_REJECT_PRESETS}
        onCancel={() => setRejectRow(null)}
        onConfirm={(reason) => rejectRow && doReject(rejectRow, reason)}
      />

      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewRow?.title}
              {viewRow && <StatusPill status={viewRow.status} />}
            </DialogTitle>
          </DialogHeader>
          {viewRow && (
            <div className="space-y-4 text-sm">
              {viewRow.banner_url && (
                <img src={viewRow.banner_url} alt="Task banner" className="w-full rounded-lg border border-border max-h-64 object-cover" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Info label="Publisher" value={viewRow.publisher?.username ?? "—"} />
                <Info label="Publisher email" value={viewRow.publisher?.email ?? "—"} />
                <Info label="Reward" value={fmtMoney(viewRow.reward)} />
                <Info label="Slots" value={`${viewRow.completed_slots} / ${viewRow.total_slots}`} />
                <Info label="Category" value={viewRow.category ?? "general"} />
                <Info label="Created" value={fmtDate(viewRow.created_at)} />
                {viewRow.deadline && <Info label="Deadline" value={fmtDate(viewRow.deadline)} />}
                <Info label="Proof type" value={`${viewRow.proof_type ?? "—"} (×${viewRow.proof_count ?? 1})`} />
              </div>
              {viewRow.description && (
                <Section title="Description"><p className="whitespace-pre-wrap text-muted-foreground">{viewRow.description}</p></Section>
              )}
              {viewRow.instructions && (
                <Section title="Instructions"><p className="whitespace-pre-wrap text-muted-foreground">{viewRow.instructions}</p></Section>
              )}
              {Array.isArray(viewRow.proof_fields) && viewRow.proof_fields.length > 0 && (
                <Section title="Required proof fields">
                  <ul className="space-y-1">
                    {viewRow.proof_fields.map((f: any, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <Badge variant="outline">{f.type}</Badge>
                        <span>{f.label}</span>
                        {f.required && <span className="text-xs text-destructive">required</span>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {["pending","active","paused"].includes(viewRow.status) && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="destructive" className="flex-1" onClick={() => { setRejectRow(viewRow); setViewRow(null); }}>
                    <X className="h-4 w-4 mr-1" />Reject & Refund
                  </Button>
                  {viewRow.status === "pending" && (
                    <Button className="flex-1" onClick={() => { setApproveRow(viewRow); setViewRow(null); }}>
                      <Check className="h-4 w-4 mr-1" />Accept
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5 break-all">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      {children}
    </div>
  );
}
