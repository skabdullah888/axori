import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gavel, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtDate } from "@/lib/admin-utils";
import { ListSkeleton } from "@/components/section-loader";

type Search = { submissionId?: string };
export const Route = createFileRoute("/app/appeals")({
  head: () => ({ meta: [{ title: "Appeals — AxoraBD" }] }),
  staticData: { title: "Appeals" },
  component: AppealsPage,
  validateSearch: (s: Record<string, unknown>): Search => ({ submissionId: s.submissionId as string | undefined }),
});

function AppealsPage() {
  const { session } = useAuth();
  const initial = Route.useSearch();
  const [appeals, setAppeals] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ submission_id: initial.submissionId ?? "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!session?.user) return;
    const [a, r] = await Promise.all([
      supabase.from("appeals").select("*, submission:task_submissions(task:tasks(title))")
        .eq("user_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("task_submissions").select("id, task:tasks(title)")
        .eq("user_id", session.user.id).eq("status", "rejected"),
    ]);
    setAppeals(a.data ?? []);
    setRejected(r.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!session?.user) return;
    const ch = supabase.channel(`my-appeals-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appeals", filter: `user_id=eq.${session.user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => { if (initial.submissionId) setOpen(true); }, [initial.submissionId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !form.submission_id || !form.reason) return;
    setBusy(true);
    const { error } = await supabase.from("appeals").insert({
      user_id: session.user.id, submission_id: form.submission_id, reason: form.reason, status: "pending",
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success("Appeal submitted to admin");
    setOpen(false); setForm({ submission_id: "", reason: "" }); setBusy(false);
  };

  const usedSubIds = new Set(appeals.map((a) => a.submission_id));
  const availableSubs = rejected.filter((r) => !usedSubIds.has(r.id));

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5 text-primary" /> Your Appeals</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={availableSubs.length === 0}><Plus className="h-4 w-4" /> New appeal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>File an appeal</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Rejected submission</Label>
                  <Select value={form.submission_id} onValueChange={(v) => setForm((f) => ({ ...f, submission_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {availableSubs.map((s) => <SelectItem key={s.id} value={s.id}>{s.task?.title ?? s.id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Why should admin reconsider?</Label>
                  <Textarea rows={5} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} required />
                </div>
                <Button type="submit" disabled={busy} className="w-full">{busy ? "Submitting…" : "Submit appeal"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {appeals.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No appeals filed.</p>
          ) : (
            <div className="space-y-3">
              {appeals.map((a) => (
                <div key={a.id} className="p-4 rounded-lg border border-border bg-card/40">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div>
                      <p className="font-medium">{a.submission?.task?.title ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</p>
                    </div>
                    <Badge variant="outline" className={
                      a.status === "approved" ? "border-success/40 text-success" :
                      a.status === "rejected" ? "border-destructive/40 text-destructive" :
                      "border-warning/40 text-warning"
                    }>{a.status}</Badge>
                  </div>
                  <p className="text-sm">{a.reason}</p>
                  {a.admin_note && (
                    <div className="mt-2 p-2 rounded bg-primary/10 border border-primary/30 text-xs">
                      <strong>Admin response:</strong> {a.admin_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
