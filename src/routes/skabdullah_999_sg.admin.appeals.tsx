import { useEffect, useMemo, useState } from "react";
import { Paginator } from "@/components/paginator";
const PAGE_SIZE = 25;
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";
import { fmtDate, StatusPill, EmptyState, fmtMoney, notify } from "@/lib/admin-utils";
import { ProofThumb } from "@/components/proof-image";

export const Route = createFileRoute("/skabdullah_999_sg/admin/appeals")({
  head: () => ({ meta: [{ title: "Admin Appeals — AxoraBD" }] }),
  component: AppealsPage,
});

type Row = any;

function AppealsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Row | null>(null);
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);
  const paged = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);


  const load = async () => {
    const { data } = await supabase
      .from("appeals")
      .select("*, profile:profiles!appeals_user_id_fkey(*), submission:task_submissions!inner(*, task:tasks(*, publisher:profiles(*)), proofs:task_submission_proofs(*))")
      .eq("submission.status", "rejected")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("appeals-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appeals" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const decide = async (row: Row, decision: "approved" | "rejected") => {
    const { error } = await supabase.from("appeals")
      .update({ status: decision, admin_note: note, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }

    if (decision === "approved" && row.submission) {
      const reward = Number(row.submission.task?.reward ?? 0);
      await supabase.from("task_submissions").update({ status: "approved" }).eq("id", row.submission.id);

      await notify(row.user_id, "appeal", "Appeal approved", `Your appeal was approved. ${fmtMoney(reward)} credited.`);
      if (row.submission.task?.publisher_id)
        await notify(row.submission.task.publisher_id, "appeal", "Submission overridden", "Admin approved an appeal on your task.");
      toast.success(`Appeal approved · ${fmtMoney(reward)} credited`);
    } else {
      await notify(row.user_id, "appeal", "Appeal rejected", note || "Your appeal was reviewed and rejected.");
      toast.success("Appeal rejected");
    }
    setOpen(null); setNote(""); load();
  };

  return (
    <AdminShell title="Appeals Center">
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <EmptyState message="No appeals yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Task</th>
                  <th className="text-left px-4 py-3">Reason</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3">{r.profile?.username ?? "—"}</td>
                    <td className="px-4 py-3">{r.submission?.task?.title ?? "—"}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{r.reason}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => { setOpen(r); setNote(r.admin_note ?? ""); }}>
                        <Eye className="h-4 w-4 mr-1" /> Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>
      <Paginator page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />


      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Appeal Review</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-muted-foreground">User</div><div>{open.profile?.username}</div></div>
                <div><div className="text-muted-foreground">Task</div><div>{open.submission?.task?.title}</div></div>
                <div><div className="text-muted-foreground">Publisher</div><div>{open.submission?.task?.publisher?.username ?? "—"}</div></div>
                <div><div className="text-muted-foreground">Reward</div><div>{fmtMoney(open.submission?.task?.reward)}</div></div>
                <div><div className="text-muted-foreground">Submission status</div><div><StatusPill status={open.submission?.status ?? "—"} /></div></div>
                <div><div className="text-muted-foreground">Appeal status</div><div><StatusPill status={open.status} /></div></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Publisher's rejection response</div>
                <div className="bg-muted/30 rounded-md p-3 text-sm">{open.submission?.note || "No note provided by publisher."}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">User's appeal reason</div>
                <div className="bg-muted/30 rounded-md p-3 text-sm">{open.reason}</div>
              </div>
              {open.submission?.proofs?.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Proof images</div>
                  <div className="grid grid-cols-3 gap-2">
                    {open.submission.proofs.map((p: any) => (
                      <ProofThumb key={p.id} src={p.image_url} className="rounded-md border border-border w-full h-24 object-cover" />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Admin note</div>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </div>
              {open.status === "pending" && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="destructive" onClick={() => decide(open, "rejected")}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button onClick={() => decide(open, "approved")}>
                    <Check className="h-4 w-4 mr-1" /> Approve & Credit
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
