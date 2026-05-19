import { useEffect, useMemo, useState } from "react";
import { Paginator } from "@/components/paginator";
const PAGE_SIZE = 25;
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { fmtDate, EmptyState } from "@/lib/admin-utils";

export const Route = createFileRoute("/skabdullah_999_sg/admin/security-logs")({
  head: () => ({ meta: [{ title: "Admin Security Logs — Axora" }] }),
  component: SecurityLogsPage,
});

function SecurityLogsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [suspiciousOnly]);
  const paged = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);


  const load = async () => {
    let q = supabase.from("security_logs").select("*").order("created_at", { ascending: false }).limit(300);
    if (suspiciousOnly) q = q.eq("suspicious", true);
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, [suspiciousOnly]);

  return (
    <AdminShell title="Security Logs">
      <div className="flex gap-2 mb-4">
        <Button size="sm" variant={!suspiciousOnly ? "default" : "secondary"} onClick={() => setSuspiciousOnly(false)}>All</Button>
        <Button size="sm" variant={suspiciousOnly ? "default" : "secondary"} onClick={() => setSuspiciousOnly(true)}>
          <AlertTriangle className="h-4 w-4 mr-1" /> Suspicious
        </Button>
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? <EmptyState message="No log entries." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">IP</th>
                  <th className="text-left px-4 py-3">Flag</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">{r.username ?? r.user_id ?? "—"}</td>
                    <td className="px-4 py-3">{r.action}</td>
                    <td className="px-4 py-3">{r.ip_address ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.suspicious
                        ? <span className="inline-flex items-center gap-1 text-destructive text-xs"><AlertTriangle className="h-3 w-3" /> suspicious</span>
                        : <span className="text-xs text-muted-foreground">normal</span>}
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
