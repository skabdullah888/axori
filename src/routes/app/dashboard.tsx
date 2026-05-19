import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Clock, CheckCircle2, ListTodo, Users2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserShell, LockOverlay } from "@/components/user-shell";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/dashboard")({ component: DashboardPage });

function StatCard({ icon: Icon, label, value, gradient, suffix = "" }: any) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5">
      <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-20 blur-3xl ${gradient}`} />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-2">{suffix}{typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}</p>
          </div>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${gradient}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { session } = useAuth();
  const { profile, isActive, loading } = useProfile();
  const [stats, setStats] = useState({ totalEarn: 0, pending: 0, completed: 0, active: 0, refEarn: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [activationAmount, setActivationAmount] = useState<number | null>(null);

  const load = async () => {
    if (!session?.user) return;
    const uid = session.user.id;
    const [earn, pend, done, act, ref, notif] = await Promise.all([
      supabase.from("payments").select("amount").eq("user_id", uid).eq("status", "approved").eq("type", "earning"),
      supabase.from("task_submissions").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "pending"),
      supabase.from("task_submissions").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "approved"),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("referral_earnings").select("amount").eq("referrer_id", uid).eq("status", "approved"),
      supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
    ]);
    setStats({
      totalEarn: (earn.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
      pending: pend.count ?? 0,
      completed: done.count ?? 0,
      active: act.count ?? 0,
      refEarn: (ref.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
    });
    setActivity(notif.data ?? []);
  };

  useEffect(() => {
    load();
    supabase.from("settings").select("activation_amount").limit(1).maybeSingle()
      .then(({ data }) => setActivationAmount(data?.activation_amount ?? null));
    if (!session?.user) return;
    const ch = supabase.channel(`dash-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  return (
    <UserShell title="Dashboard">
      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h2 className="text-2xl font-bold mt-1">{profile?.username ?? "—"}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={isActive ? "border-success/40 text-success" : "border-warning/40 text-warning"}>
                {isActive ? "✓ Account Active" : "⚠ Account Inactive"}
              </Badge>
              {profile?.referral_code && (
                <Badge variant="outline" className="border-primary/40 text-primary">Ref: {profile.referral_code}</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mt-1">
              ${Number(profile?.balance ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {!isActive && !loading && (
        <Link to="/app/profile" className="block mb-6 group">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-warning/20 via-warning/10 to-transparent border border-warning/30 flex items-center justify-between gap-4 transition-all hover:border-warning/60 hover:shadow-lg hover:shadow-warning/10">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-warning/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold">Activate your account to start earning</p>
                <p className="text-sm text-muted-foreground">
                  One-time activation fee:{" "}
                  <span className="font-bold text-warning">
                    ${Number(activationAmount ?? 0).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-warning group-hover:translate-x-1 transition-transform hidden sm:inline">Activate now →</span>
          </div>
        </Link>
      )}

      <div className="relative">
        {!isActive && !loading && <LockOverlay message={`Activate your account ($${Number(activationAmount ?? 0).toFixed(2)}) to start earning from tasks.`} />}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={Wallet} label="Balance" value={Number(profile?.balance ?? 0)} suffix="$" gradient="bg-gradient-to-br from-primary to-primary/60" />
          <StatCard icon={TrendingUp} label="Total Earned" value={stats.totalEarn} suffix="$" gradient="bg-gradient-to-br from-success to-success/60" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} gradient="bg-gradient-to-br from-warning to-warning/60" />
          <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
          <StatCard icon={Users2} label="Referral $" value={stats.refEarn} suffix="$" gradient="bg-gradient-to-br from-amber-400 to-amber-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ListTodo className="h-4 w-4 text-primary" /> Available tasks</CardTitle>
            <Badge variant="outline">{stats.active} active</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Browse tasks to start earning. New tasks appear here in realtime.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              activity.map((n) => (
                <div key={n.id} className="text-sm border-l-2 border-primary/40 pl-3 py-1">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </UserShell>
  );
}
