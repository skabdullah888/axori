import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Paginator } from "@/components/paginator";
const PAGE_SIZE = 15;
import { Gavel, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserShell } from "@/components/user-shell";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtMoney } from "@/lib/admin-utils";

export const Route = createFileRoute("/app/submissions")({
  head: () => ({ meta: [{ title: "My Submissions — Axora" }] }),
  staticData: { title: "My Submissions" },
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [tab]);

  const load = async () => {
    if (!session?.user) return;
    const { data } = await supabase.from("task_submissions")
      .select("*, task:tasks(title,reward,publisher:profiles(username)), proofs:task_submission_proofs(image_url)")
      .eq("user_id", session.user.id).order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    if (!session?.user) return;
    const ch = supabase.channel(`my-subs-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions", filter: `user_id=eq.${session.user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const filtered = rows.filter((r) => tab === "all" || r.status === tab);
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);


  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending ({rows.filter((r) => r.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({rows.filter((r) => r.status === "approved").length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rows.filter((r) => r.status === "rejected").length})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <FileCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
              No submissions in this tab.
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {paged.map((r) => (
                <Card key={r.id} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{r.task?.title ?? "—"}</h3>
                          <Badge variant="outline" className={
                            r.status === "approved" ? "border-success/40 text-success" :
                            r.status === "rejected" ? "border-destructive/40 text-destructive" :
                            "border-warning/40 text-warning"
                          }>{r.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">by @{r.task?.publisher?.username ?? "—"} · {fmtDate(r.created_at)}</p>
                        {r.note && (
                          <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                            <strong>Publisher note:</strong> {r.note}
                          </div>
                        )}
                        {r.proofs?.length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {r.proofs.map((p: any, i: number) => (
                              <a key={i} href={p.image_url} target="_blank" rel="noreferrer"
                                 className="block w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary">
                                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Reward</p>
                        <p className="text-lg font-bold text-primary">{fmtMoney(r.task?.reward)}</p>
                        {r.status === "rejected" && (
                          <Link to="/app/appeals" search={{ submissionId: r.id } as any}>
                            <Button size="sm" variant="outline" className="mt-2"><Gavel className="h-3 w-3 mr-1" />Appeal</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Paginator page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />

        </TabsContent>
      </Tabs>
    </>
  );
}
