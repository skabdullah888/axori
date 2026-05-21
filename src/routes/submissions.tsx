import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, Check, X } from "lucide-react";
import { fmtDate, StatusPill, EmptyState, notify, fmtMoney } from "@/lib/admin-utils";
import { ProofThumb } from "@/components/proof-image";

export const Route = createFileRoute("/submissions")({
  head: () => ({ meta: [{ title: "Submissions — AxoraBD" }] }),
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<any | null>(null);

  const load = async () => {
    const { data } = await supabase.from("task_submissions")
      .select("*, user:profiles!task_submissions_user_id_fkey(*), task:tasks(*, publisher:profiles!tasks_publisher_id_fkey(*)), proofs:task_submission_proofs(*)")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("subs-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const override = async (row: any, decision: "approved" | "rejected") => {
    const { error } = await supabase.from("task_submissions")
      .update({ status: decision, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    if (decision === "approved") {
      const reward = Number(row.task?.reward ?? 0);
      await notify(row.user_id, "submission", "Submission approved", `Admin approved your submission. ${fmtMoney(reward)} credited.`);
    } else {
      await notify(row.user_id, "submission", "Submission rejected", "Admin rejected your submission for suspicious activity.");
    }
    toast.success(`Submission ${decision}`);
    setOpen(null); load();
  };

  return (
    <AdminShell title="Submissions">
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <EmptyState message="No submissions." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Task</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Publisher</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Submitted</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3">{r.task?.title ?? "—"}</td>
                    <td className="px-4 py-3">{r.user?.username ?? "—"}</td>
                    <td className="px-4 py-3">{r.task?.publisher?.username ?? "—"}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setOpen(r)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Submission detail</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-muted-foreground">Task</div><div>{open.task?.title}</div></div>
                <div><div className="text-muted-foreground">Reward</div><div>{fmtMoney(open.task?.reward)}</div></div>
                <div><div className="text-muted-foreground">User</div><div>{open.user?.username}</div></div>
                <div><div className="text-muted-foreground">Status</div><div><StatusPill status={open.status} /></div></div>
              </div>
              {open.proofs?.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Proof images</div>
                  <div className="grid grid-cols-3 gap-2">
                    {open.proofs.map((p: any) => (
                      <ProofThumb key={p.id} src={p.image_url} className="rounded-md border border-border w-full h-28 object-cover" />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="destructive" onClick={() => override(open, "rejected")}>
                  <X className="h-4 w-4 mr-1" /> Reject (override)
                </Button>
                <Button onClick={() => override(open, "approved")}>
                  <Check className="h-4 w-4 mr-1" /> Approve (override)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
