import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDate, StatusPill, EmptyState, fmtMoney } from "@/lib/admin-utils";

export const Route = createFileRoute("/tasks")({ component: TasksPage });

function TasksPage() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("tasks")
      .select("*, publisher:profiles(*)").order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("tasks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <AdminShell title="Tasks Overview">
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
