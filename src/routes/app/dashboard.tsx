import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, Clock, CheckCircle2, ListTodo, Users2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/section-loader";
import { NoticeBoard } from "@/components/notice-board";
import { DailyCheckinCard } from "@/components/daily-checkin-card";
import { AnimatedCounter } from "@/components/animated-counter";
import { Sparkline } from "@/components/sparkline";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AxoraBD" }] }),
  staticData: { title: "Dashboard" },
  component: DashboardPage,
});

function StatCard({ icon: Icon, label, value, gradient, suffix = "", prefix = "", decimals = 0 }: any) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur transition-all hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5">
      <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-20 blur-3xl ${gradient}`} />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider truncate">{label}</p>
            <p className="text-2xl font-bold mt-2 tabular-nums">
              <AnimatedCounter value={Number(value) || 0} prefix={prefix} suffix={suffix} decimals={decimals} />
            </p>
          </div>
          <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${gradient}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function DashboardPage() {
  const { session } = useAuth();
  const { profile, isActive, loading } = useProfile();
  const [stats, setStats] = useState({ totalEarn: 0, pending: 0, completed: 0, active: 0, refEarn: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [earnSeries, setEarnSeries] = useState<number[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);


  const load = async () => {
    if (!session?.user) return;
    const uid = session.user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [earn, pend, done, act, ref, notif, earnSeries7] = await Promise.all([
      supabase.from("payments").select("amount").eq("user_id", uid).eq("status", "approved").eq("type", "earning"),
      supabase.from("task_submissions").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "pending"),
      supabase.from("task_submissions").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "approved"),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("referral_earnings").select("amount").eq("referrer_id", uid).eq("status", "approved"),
      supabase.from("notifications").select("*").eq("user_id", uid).eq("admin_targeted", false).order("created_at", { ascending: false }).limit(5),
      supabase.from("payments").select("amount, created_at").eq("user_id", uid).eq("status", "approved").eq("type", "earning").gte("created_at", sevenDaysAgo),
    ]);
    setStats({
      totalEarn: (earn.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
      pending: pend.count ?? 0,
      completed: done.count ?? 0,
      active: act.count ?? 0,
      refEarn: (ref.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
    });
    setActivity(notif.data ?? []);

    // Build 7-day daily totals sparkline
    const buckets = Array(7).fill(0) as number[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const row of (earnSeries7.data ?? []) as any[]) {
      const d = new Date(row.created_at);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
      if (diff >= 0 && diff < 7) buckets[6 - diff] += Number(row.amount) || 0;
    }
    setEarnSeries(buckets);
    setStatsLoading(false);
  };

  useEffect(() => {
    load();

    if (!session?.user) return;
    const ch = supabase.channel(`dash-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  return (
    <>
      <NoticeBoard />
      <DailyCheckinCard />
      {loading ? (
        <div className="mb-6 p-6 rounded-2xl border border-border/60 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-32 mt-2" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-3 w-28 ml-auto" />
            <Skeleton className="h-9 w-36 ml-auto" />
          </div>
        </div>
      ) : (
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{greetingFor()},</p>
              <h2 className="text-2xl font-bold mt-1 truncate">👋 {profile?.username ?? "—"}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className={isActive ? "border-success/40 text-success" : "border-warning/40 text-warning"}>
                  {isActive ? "✓ Account Active" : "⚠ Account Inactive"}
                </Badge>
                {profile?.referral_code && isActive && (
                  <Badge variant="outline" className="border-primary/40 text-primary">Ref: {profile.referral_code}</Badge>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mt-1 tabular-nums">
                ৳<AnimatedCounter value={Number(profile?.balance ?? 0)} decimals={2} />
              </p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">7-day earnings</span>
                <Sparkline data={earnSeries.length ? earnSeries : [0, 0, 0, 0, 0, 0, 0]} width={90} height={28} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/60"><CardContent className="p-5">
              <Skeleton className="h-3 w-16 mb-3" />
              <Skeleton className="h-7 w-20" />
            </CardContent></Card>
          ))
        ) : (
          <>
            <StatCard icon={Wallet} label="Balance" value={Number(profile?.balance ?? 0)} suffix=" ৳" gradient="bg-gradient-to-br from-primary to-primary/60" />
            <StatCard icon={TrendingUp} label="Total Earned" value={stats.totalEarn} suffix=" ৳" gradient="bg-gradient-to-br from-success to-success/60" />
            <StatCard icon={Clock} label="Pending" value={stats.pending} gradient="bg-gradient-to-br from-warning to-warning/60" />
            <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
            <StatCard icon={Users2} label="Referral ৳" value={stats.refEarn} suffix=" ৳" gradient="bg-gradient-to-br from-amber-400 to-amber-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ListTodo className="h-4 w-4 text-primary" /> Available tasks</CardTitle>
            {statsLoading ? <Skeleton className="h-5 w-16" /> : <Badge variant="outline">{stats.active} active</Badge>}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Browse tasks to start earning. New tasks appear here in realtime.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {statsLoading ? (
              <ListSkeleton count={3} />
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
    </>
  );
}
