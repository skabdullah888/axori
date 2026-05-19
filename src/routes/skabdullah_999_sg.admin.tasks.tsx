import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/skabdullah_999_sg/admin/tasks")({ component: TasksPage });

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
    if (error) { toast.error(error.message); return; }
    await notify(row.publisher_id, "system", "Task approved", `Your task "${row.title}" has been approved and is now live.`);
    toast.success("Task approved");
    setApproveRow(null);
  };

  const doReject = async (row: any, reason: string) => {
    const { error } = await supabase.from("tasks").update({ status: "rejected" }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    await notify(row.publisher_id, "system", "Task rejected", `Your task "${row.title}" was rejected. Reason: ${reason}`);
    toast.success("Task rejected");
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
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">{r.title}</td>
                    <td className="px-4 py-3">{r.publisher?.username ?? "—"}</td>
                    <td className="px-4 py-3">{fmtMoney(r.reward)}</td>
                    <td className="px-4 py-3">{r.completed_slots} / {r.total_slots}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" ? (
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => setRejectRow(r)}><X className="h-4 w-4 mr-1" />Reject</Button>
                          <Button size="sm" onClick={() => setApproveRow(r)}><Check className="h-4 w-4 mr-1" />Accept</Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
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
    </AdminShell>
  );
}
