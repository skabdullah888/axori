import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ListTodo, FileCheck, Gavel, Wallet, Activity } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

type Stats = {
  users: number; tasks: number; pendingSubs: number;
  pendingAppeals: number; pendingPayments: number; activity: number;
};

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ users: 0, tasks: 0, pendingSubs: 0, pendingAppeals: 0, pendingPayments: 0, activity: 0 });

  const load = async () => {
    const [u, t, ps, pa, pp, sl] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("tasks").select("*", { count: "exact", head: true }),
      supabase.from("task_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("appeals").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("security_logs").select("*", { count: "exact", head: true }),
    ]);
    setStats({
      users: u.count ?? 0, tasks: t.count ?? 0, pendingSubs: ps.count ?? 0,
      pendingAppeals: pa.count ?? 0, pendingPayments: pp.count ?? 0, activity: sl.count ?? 0,
    });
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <AdminShell title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.users} accent="bg-primary/15 text-primary" />
        <StatCard icon={ListTodo} label="Total Tasks" value={stats.tasks} accent="bg-success/15 text-success" />
        <StatCard icon={FileCheck} label="Pending Submissions" value={stats.pendingSubs} accent="bg-warning/15 text-warning" />
        <StatCard icon={Gavel} label="Pending Appeals" value={stats.pendingAppeals} accent="bg-destructive/15 text-destructive" />
        <StatCard icon={Wallet} label="Pending Payments" value={stats.pendingPayments} accent="bg-warning/15 text-warning" />
        <StatCard icon={Activity} label="Platform Activity" value={stats.activity} accent="bg-accent text-foreground" />
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Realtime feed</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Stats above update live as users submit tasks, request payments, or file appeals.
        </CardContent>
      </Card>
    </AdminShell>
  );
}
