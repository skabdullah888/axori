import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Plus, ListChecks, CheckCircle2, XCircle, Eye, Clock, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { UserShell, LockOverlay } from "@/components/user-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/publish")({ component: PublishPage });

const CATEGORIES = ["social", "video", "signup", "review", "survey", "general"];
const PROOF_FIELD_TYPES = [
  { value: "text", label: "Text answer" },
  { value: "image", label: "Screenshot upload" },
  { value: "link", label: "URL / link" },
  { value: "username", label: "Username / ID" },
] as const;

type ProofField = { id: string; type: string; label: string; required: boolean };

function PublishPage() {
  const { session } = useAuth();
  const { profile, isActive } = useProfile();
  const [settings, setSettings] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [pendingSubs, setPendingSubs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [proofFields, setProofFields] = useState<ProofField[]>([
    { id: crypto.randomUUID(), type: "image", label: "Proof screenshot", required: true },
  ]);
  const [form, setForm] = useState({
    title: "", description: "", instructions: "", category: "general",
    reward: "", total_slots: "1",
  });


  const load = async () => {
    if (!session?.user) return;
    const [s, t] = await Promise.all([
      supabase.from("settings").select("*").limit(1).maybeSingle(),
      supabase.from("tasks").select("*").eq("publisher_id", session.user.id).order("created_at", { ascending: false }),
    ]);
    setSettings(s.data); setTasks(t.data ?? []);
    if (t.data && t.data.length) {
      const ids = t.data.map((x: any) => x.id);
      const { data: subs } = await supabase.from("task_submissions").select("*, tasks(title)").in("task_id", ids).eq("status", "pending").order("created_at", { ascending: false });
      setPendingSubs(subs ?? []);
    } else setPendingSubs([]);
  };

  useEffect(() => {
    if (!session?.user) return;
    load();
    const ch = supabase.channel(`pub-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `publisher_id=eq.${session.user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const taxPct = Number(settings?.publisher_task_tax ?? 0);
  const reward = Number(form.reward) || 0;
  const slots = Number(form.total_slots) || 0;
  const subtotal = reward * slots;
  const tax = (subtotal * taxPct) / 100;
  const totalCost = subtotal + tax;
  const balance = Number(profile?.balance ?? 0);
  const insufficient = totalCost > balance;

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !profile) return;
    if (insufficient) { toast.error("Insufficient balance to publish this task"); return; }
    if ((profile as any).publisher_restricted) { toast.error("Publisher access is restricted"); return; }
    setBusy(true);
    const { data: task, error } = await supabase.from("tasks").insert({
      publisher_id: session.user.id,
      title: form.title, description: form.description, instructions: form.instructions,
      category: form.category, reward, total_slots: slots,
      proof_type: form.proof_type, proof_count: Number(form.proof_count) || 1,
      status: "active",
    }).select().single();
    if (error || !task) { toast.error(error?.message ?? "Failed"); setBusy(false); return; }
    const newBalance = balance - totalCost;
    await supabase.from("profiles").update({ balance: newBalance, is_publisher: true }).eq("user_id", session.user.id);
    await supabase.from("payments").insert({
      user_id: session.user.id, type: "task_publish_hold", amount: totalCost,
      status: "approved", reference: task.id,
    });
    toast.success("Task published!");
    setForm({ title: "", description: "", instructions: "", category: "general", reward: "", total_slots: "1", proof_type: "image", proof_count: "1" });
    setBusy(false);
  };

  const reviewSub = async (subId: string, approve: boolean, taskId: string, userId: string, taskReward: number) => {
    const { error } = await supabase.from("task_submissions").update({
      status: approve ? "approved" : "rejected",
      updated_at: new Date().toISOString(),
    }).eq("id", subId);
    if (error) { toast.error(error.message); return; }
    if (approve) {
      const { data: u } = await supabase.from("profiles").select("balance").eq("user_id", userId).maybeSingle();
      if (u) await supabase.from("profiles").update({ balance: Number(u.balance) + Number(taskReward) }).eq("user_id", userId);
      const { data: t } = await supabase.from("tasks").select("completed_slots,total_slots").eq("id", taskId).maybeSingle();
      if (t) {
        const cs = (t.completed_slots ?? 0) + 1;
        await supabase.from("tasks").update({
          completed_slots: cs,
          status: cs >= (t.total_slots ?? 0) ? "completed" : "active",
        }).eq("id", taskId);
      }
      await supabase.from("payments").insert({
        user_id: userId, type: "task_earning", amount: taskReward, status: "approved", reference: taskId,
      });
    }
    await supabase.from("notifications").insert({
      user_id: userId,
      title: approve ? "Submission approved" : "Submission rejected",
      message: approve ? `You earned $${taskReward.toFixed(2)}` : "Your submission was rejected by the publisher.",
      type: approve ? "submission_approved" : "submission_rejected",
    });
    toast.success(approve ? "Approved & user paid" : "Rejected");
  };

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => t.status === "active").length,
    completed: tasks.filter(t => t.status === "completed").length,
    totalSlots: tasks.reduce((s, t) => s + (t.total_slots ?? 0), 0),
    filledSlots: tasks.reduce((s, t) => s + (t.completed_slots ?? 0), 0),
    spent: tasks.reduce((s, t) => s + Number(t.reward ?? 0) * (t.completed_slots ?? 0), 0),
  };

  return (
    <UserShell title="Publish Task">
      <div className="relative">
        {!isActive && <LockOverlay message="Activate your account to publish tasks." />}
        <Tabs defaultValue="create">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-6">
            <TabsTrigger value="create"><Plus className="h-3.5 w-3.5" /> Create</TabsTrigger>
            <TabsTrigger value="mine"><ListChecks className="h-3.5 w-3.5" /> My Tasks</TabsTrigger>
            <TabsTrigger value="reviews"><Eye className="h-3.5 w-3.5" /> Reviews</TabsTrigger>
            <TabsTrigger value="stats"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="max-w-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Create a new task</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createTask} className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required maxLength={120} /></div>
                  <div className="space-y-2"><Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
                  <div className="space-y-2"><Label>Detailed instructions</Label>
                    <Textarea value={form.instructions} onChange={(e) => setForm(f => ({ ...f, instructions: e.target.value }))} rows={4} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Proof type</Label>
                      <Select value={form.proof_type} onValueChange={(v) => setForm(f => ({ ...f, proof_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2"><Label>Reward / slot ($)</Label>
                      <Input type="number" step="0.01" min="0.01" value={form.reward}
                        onChange={(e) => setForm(f => ({ ...f, reward: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label>Total slots</Label>
                      <Input type="number" min="1" value={form.total_slots}
                        onChange={(e) => setForm(f => ({ ...f, total_slots: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label>Proof count</Label>
                      <Input type="number" min="1" max="10" value={form.proof_count}
                        onChange={(e) => setForm(f => ({ ...f, proof_count: e.target.value }))} required /></div>
                  </div>

                  <div className="rounded-xl bg-accent/40 border border-border p-4 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Platform tax ({taxPct}%)</span><span>${tax.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold border-t border-border pt-2 mt-1"><span>Total cost</span><span>${totalCost.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Your balance</span>
                      <span className={insufficient ? "text-destructive" : "text-success"}>${balance.toFixed(2)}</span></div>
                  </div>

                  <Button type="submit" disabled={busy || insufficient || !form.reward || !form.total_slots}
                    className="w-full bg-gradient-to-r from-primary to-primary/80">
                    {busy ? "Publishing…" : insufficient ? "Insufficient balance" : `Publish task ($${totalCost.toFixed(2)})`}
                  </Button>
                  {insufficient && (
                    <p className="text-xs text-center text-muted-foreground">
                      <Link to="/app/deposit" className="text-primary hover:underline">Deposit funds</Link> to publish
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mine">
            {tasks.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />No tasks published yet.
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {tasks.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{t.title}</p>
                          <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                          <Badge className={
                            t.status === "active" ? "bg-success/20 text-success border-success/30" :
                            t.status === "completed" ? "bg-primary/20 text-primary border-primary/30" :
                            "bg-muted text-muted-foreground"
                          }>{t.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${Number(t.reward).toFixed(2)} · {t.completed_slots}/{t.total_slots} slots ·
                          Created {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">${(Number(t.reward) * t.completed_slots).toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">paid out</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {pendingSubs.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />No pending submissions.
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {pendingSubs.map((s) => {
                  const task = tasks.find(t => t.id === s.task_id);
                  return (
                    <Card key={s.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                          <div>
                            <p className="font-semibold text-sm">{s.tasks?.title ?? task?.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                          </div>
                          <Badge className="bg-warning/20 text-warning border-warning/30">Pending</Badge>
                        </div>
                        {s.proof_text && <p className="text-sm bg-accent/40 p-3 rounded mb-3 whitespace-pre-wrap">{s.proof_text}</p>}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => reviewSub(s.id, true, s.task_id, s.user_id, Number(task?.reward ?? 0))}
                            className="bg-success text-success-foreground hover:bg-success/90">
                            <CheckCircle2 className="h-4 w-4" /> Approve & Pay
                          </Button>
                          <Button size="sm" variant="destructive"
                            onClick={() => reviewSub(s.id, false, s.task_id, s.user_id, Number(task?.reward ?? 0))}>
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-5">
                <p className="text-xs text-muted-foreground">TOTAL TASKS</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-xs text-muted-foreground">ACTIVE</p>
                <p className="text-3xl font-bold mt-1 text-success">{stats.active}</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-xs text-muted-foreground">COMPLETED</p>
                <p className="text-3xl font-bold mt-1 text-primary">{stats.completed}</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-xs text-muted-foreground">SLOTS FILLED</p>
                <p className="text-3xl font-bold mt-1">{stats.filledSlots}/{stats.totalSlots}</p>
              </CardContent></Card>
              <Card className="md:col-span-2"><CardContent className="p-5">
                <p className="text-xs text-muted-foreground">TOTAL SPENT ON WORKERS</p>
                <p className="text-3xl font-bold mt-1 text-warning">${stats.spent.toFixed(2)}</p>
              </CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </UserShell>
  );
}
