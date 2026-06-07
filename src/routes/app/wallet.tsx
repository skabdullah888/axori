import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TutorialButton } from "@/components/tutorial-button";
import { AdSlot } from "@/components/ad-slot";

export const Route = createFileRoute("/app/wallet")({
  head: () => ({ meta: [{ title: "Wallet — AxoraBD" }] }),
  staticData: { title: "Wallet" },
  component: WalletPage,
});

const fmt = (n: number) => `৳${Number(n ?? 0).toFixed(2)}`;
const statusVariant = (s: string) =>
  s === "approved" || s === "completed" ? "bg-success/20 text-success border-success/30"
  : s === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30"
  : "bg-warning/20 text-warning border-warning/30";

function WalletPage() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const [payments, setPayments] = useState<any[]>([]);
  const [held, setHeld] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!session?.user) return;
    const uid = session.user.id;
    const [p, w, s] = await Promise.all([
      supabase.from("payments").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("payments").select("amount").eq("user_id", uid).eq("type", "withdrawal").eq("status", "pending"),
      supabase.from("task_submissions").select("status, tasks(reward)").eq("user_id", uid),
    ]);
    setPayments(p.data ?? []);
    setHeld((w.data ?? []).reduce((a, x: any) => a + Number(x.amount ?? 0), 0));
    const subs = (s.data ?? []) as any[];
    setPendingEarnings(subs.filter((x) => x.status === "pending").reduce((a, x) => a + Number(x.tasks?.reward ?? 0), 0));
    setTotalEarned(subs.filter((x) => x.status === "approved").reduce((a, x) => a + Number(x.tasks?.reward ?? 0), 0));
    setLoading(false);
  };

  useEffect(() => {
    reload();
    if (!session?.user) return;
    const ch = supabase.channel(`wallet-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `user_id=eq.${session.user.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions", filter: `user_id=eq.${session.user.id}` }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const available = Number(profile?.balance ?? 0);

  const filterByType = (t: string) => payments.filter((p) => p.type === t);

  return (
    <>
      <div className="mb-4 flex justify-end"><TutorialButton sectionKey="wallet" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5 space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-28" />
            </CardContent></Card>
          ))
        ) : (
          <>
            {/* stat cards */}
        <Card className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-primary/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Available</span>
              <WalletIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">{fmt(available)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Held</span>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div className="text-3xl font-bold">{fmt(held)}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending withdrawals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Pending earnings</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{fmt(pendingEarnings)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Total earned</span>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div className="text-3xl font-bold">{fmt(totalEarned)}</div>
          </CardContent>
        </Card>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button asChild className="bg-gradient-to-r from-primary to-primary/80">
          <Link to="/app/deposit"><ArrowDownToLine className="h-4 w-4" /> Deposit</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/withdraw"><ArrowUpFromLine className="h-4 w-4" /> Withdraw</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposit">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
              <TabsTrigger value="activation">Activation</TabsTrigger>
            </TabsList>
            {["all", "deposit", "withdrawal", "activation"].map((t) => (
              <TabsContent key={t} value={t} className="mt-4">
                {loading ? (
                  <div className="space-y-2 py-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <TxTable rows={t === "all" ? payments : filterByType(t)} />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}

function TxTable({ rows }: { rows: any[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-8 text-center">No transactions yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="capitalize">{r.type}</TableCell>
            <TableCell>{r.method ?? "—"}</TableCell>
            <TableCell className="font-mono text-xs">{r.trnx_id ?? r.reference ?? "—"}</TableCell>
            <TableCell className="text-right font-semibold">{fmt(r.amount)}</TableCell>
            <TableCell><Badge variant="outline" className={statusVariant(r.status)}>{r.status}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
