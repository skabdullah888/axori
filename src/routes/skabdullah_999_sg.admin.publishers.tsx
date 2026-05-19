import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Ban, ShieldCheck, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/lib/admin-utils";

export const Route = createFileRoute("/skabdullah_999_sg/admin/publishers")({ component: PublishersPage });

function PublishersPage() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    // publishers are profiles that have at least one task
    const { data: tasks } = await supabase.from("tasks").select("publisher_id");
    const publisherIds = Array.from(new Set((tasks ?? []).map(t => t.publisher_id).filter((x): x is string => !!x)));
    if (publisherIds.length === 0) { setRows([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", publisherIds);
    const { data: subs } = await supabase.from("task_submissions").select("status, task:tasks(publisher_id)");
    const stats: Record<string, { total: number; rejected: number; approved: number }> = {};
    (subs ?? []).forEach((s: any) => {
      const pid = s.task?.publisher_id;
      if (!pid) return;
      stats[pid] = stats[pid] ?? { total: 0, rejected: 0, approved: 0 };
      stats[pid].total++;
      if (s.status === "rejected") stats[pid].rejected++;
      if (s.status === "approved") stats[pid].approved++;
    });
    const taskCounts: Record<string, number> = {};
    (tasks ?? []).forEach(t => { if (t.publisher_id) taskCounts[t.publisher_id] = (taskCounts[t.publisher_id] ?? 0) + 1; });
    setRows((profiles ?? []).map(p => ({
      ...p,
      taskCount: taskCounts[p.id] ?? 0,
      stats: stats[p.id] ?? { total: 0, rejected: 0, approved: 0 },
    })));
  };

  useEffect(() => { load(); }, []);

  const restrict = async (id: string, restricted: boolean) => {
    const { error } = await supabase.from("profiles").update({ publisher_restricted: restricted }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(restricted ? "Publisher restricted" : "Restriction lifted"); load(); }
  };
  const ban = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ status: "banned" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Publisher banned"); load(); }
  };

  return (
    <AdminShell title="Publishers">
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <EmptyState message="No publishers yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Username</th>
                  <th className="text-left px-4 py-3">Tasks</th>
                  <th className="text-left px-4 py-3">Approved</th>
                  <th className="text-left px-4 py-3">Rejected</th>
                  <th className="text-left px-4 py-3">Success rate</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const rate = r.stats.total ? Math.round((r.stats.approved / r.stats.total) * 100) : 0;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-3 font-medium">
                        {r.username}
                        {r.publisher_restricted && <AlertTriangle className="inline h-4 w-4 ml-2 text-warning" />}
                      </td>
                      <td className="px-4 py-3">{r.taskCount}</td>
                      <td className="px-4 py-3">{r.stats.approved}</td>
                      <td className="px-4 py-3">{r.stats.rejected}</td>
                      <td className="px-4 py-3">{rate}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => restrict(r.id, !r.publisher_restricted)}>
                            {r.publisher_restricted ? <ShieldCheck className="h-4 w-4 mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />}
                            {r.publisher_restricted ? "Unrestrict" : "Restrict"}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => ban(r.id)}><Ban className="h-4 w-4 mr-1" />Ban</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>
    </AdminShell>
  );
}
