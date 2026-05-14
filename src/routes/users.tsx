import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Ban, ShieldCheck } from "lucide-react";
import { fmtDate, StatusPill, EmptyState, fmtMoney } from "@/lib/admin-utils";

export const Route = createFileRoute("/users")({ component: UsersPage });

function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("users-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setStatus = async (id: string, status: "active" | "banned") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else toast.success(`User ${status}`);
  };
  const setTrust = async (id: string, trust: number) => {
    const { error } = await supabase.from("profiles").update({ trust_score: trust }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Trust updated");
  };

  const filtered = rows.filter(r => !search || r.username?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminShell title="Users Management">
      <div className="mb-4 max-w-sm">
        <Input placeholder="Search username…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card><CardContent className="p-0">
        {filtered.length === 0 ? <EmptyState message="No users." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Username</th>
                  <th className="text-left px-4 py-3">Balance</th>
                  <th className="text-left px-4 py-3">Trust</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">{r.username}</td>
                    <td className="px-4 py-3">{fmtMoney(r.balance)}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        defaultValue={r.trust_score}
                        className="w-20 h-8"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== r.trust_score) setTrust(r.id, v);
                        }}
                      />
                    </td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "active" ? (
                        <Button size="sm" variant="destructive" onClick={() => setStatus(r.id, "banned")}><Ban className="h-4 w-4 mr-1" />Ban</Button>
                      ) : (
                        <Button size="sm" onClick={() => setStatus(r.id, "active")}><ShieldCheck className="h-4 w-4 mr-1" />Unban</Button>
                      )}
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
