import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Clock, Coins, Users2, ArrowRight, ListTodo, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserShell } from "@/components/user-shell";
import { ActivationRequiredDialog } from "@/components/activation-required-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/tasks")({ component: TasksPage });

function TasksPage() {
  const { session } = useAuth();
  const { isActive } = useProfile();
  const [tasks, setTasks] = useState<any[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<string>("new");

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*, publisher:profiles(username)")
      .eq("status", "active").order("created_at", { ascending: false });
    setTasks(data ?? []);
    if (session?.user) {
      const { data: subs } = await supabase.from("task_submissions").select("task_id")
        .eq("user_id", session.user.id);
      setMine(new Set((subs ?? []).map((s) => s.task_id).filter((id): id is string => !!id)));
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("tasks-browse")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const categories = useMemo(() => {
    const s = new Set<string>(); tasks.forEach((t) => t.category && s.add(t.category));
    return ["all", ...Array.from(s)];
  }, [tasks]);

  const filtered = useMemo(() => {
    let arr = tasks.filter((t) => t.completed_slots < t.total_slots);
    if (q) arr = arr.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
    if (cat !== "all") arr = arr.filter((t) => t.category === cat);
    if (sort === "reward") arr = [...arr].sort((a, b) => Number(b.reward) - Number(a.reward));
    if (sort === "slots") arr = [...arr].sort((a, b) => (b.total_slots - b.completed_slots) - (a.total_slots - a.completed_slots));
    return arr;
  }, [tasks, q, cat, sort]);

  return (
    <UserShell title="Browse Tasks">
      <div className="relative">
        {!isActive && <LockOverlay message="Activate your account to start completing tasks." />}

        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search tasks…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Newest</SelectItem>
              <SelectItem value="reward">Highest reward</SelectItem>
              <SelectItem value="slots">Most slots</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-50" />
            No tasks available right now. Check back soon!
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const submitted = mine.has(t.id);
              const remaining = t.total_slots - t.completed_slots;
              return (
                <Card key={t.id} className="group overflow-hidden border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{t.category ?? "general"}</Badge>
                      <div className="flex items-center gap-1 text-primary font-bold">
                        <Coins className="h-4 w-4" />${Number(t.reward).toFixed(2)}
                      </div>
                    </div>
                    <h3 className="font-semibold line-clamp-2 mb-1.5">{t.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{t.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><Users2 className="h-3 w-3" /> {remaining}/{t.total_slots} slots</span>
                      {t.deadline && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(t.deadline).toLocaleDateString()}</span>}
                    </div>
                    <Link to="/app/tasks/$taskId" params={{ taskId: t.id }} className="block">
                      <Button className="w-full" variant={submitted ? "secondary" : "default"} disabled={submitted}>
                        {submitted ? "Already submitted" : <>Start task <ArrowRight className="h-4 w-4" /></>}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </UserShell>
  );
}
