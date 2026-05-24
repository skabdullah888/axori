import { useEffect, useMemo, useState } from "react";
import { Paginator } from "@/components/paginator";
const PAGE_SIZE = 25;
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, Users, ScrollText } from "lucide-react";
import { fmtDate, EmptyState } from "@/lib/admin-utils";

export const Route = createFileRoute("/skabdullah_999_sg/admin/security-logs")({
  head: () => ({ meta: [{ title: "Admin Security Logs — AxoraBD" }] }),
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
    <AdminShell title="Security">
      <Tabs defaultValue="logs">
        <TabsList className="mb-4">
          <TabsTrigger value="logs" className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Logs</TabsTrigger>
          <TabsTrigger value="dupes" className="flex items-center gap-2"><Users className="h-4 w-4" /> Duplicate IPs</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
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
                    {paged.map(r => (
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
          <Paginator page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />
        </TabsContent>

        <TabsContent value="dupes">
          <DuplicateIPs />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function DuplicateIPs() {
  const [groups, setGroups] = useState<{ ip: string; users: any[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, username, email, status, signup_ip, created_at")
        .not("signup_ip", "is", null)
        .order("created_at", { ascending: false });
      const map = new Map<string, any[]>();
      (data ?? []).forEach((p: any) => {
        const ip = (p.signup_ip ?? "").trim();
        if (!ip) return;
        if (!map.has(ip)) map.set(ip, []);
        map.get(ip)!.push(p);
      });
      const grouped = Array.from(map.entries())
        .filter(([, arr]) => arr.length > 1)
        .map(([ip, users]) => ({ ip, users }))
        .sort((a, b) => b.users.length - a.users.length);
      setGroups(grouped);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card>;
  if (groups.length === 0) return <EmptyState message="No duplicate IP groups found." />;

  return (
    <div className="space-y-3">
      {groups.map(g => (
        <Card key={g.ip}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="font-mono text-sm font-semibold">{g.ip}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                {g.users.length} accounts
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Username</th>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Created</th>
                    <th className="text-left px-3 py-2">User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {g.users.map(u => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{u.username ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="px-3 py-2"><span className="text-xs">{u.status}</span></td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{fmtDate(u.created_at)}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{u.user_id ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
