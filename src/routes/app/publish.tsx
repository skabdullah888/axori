import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Plus, ListChecks, CheckCircle2, XCircle, Eye, Clock, BarChart3, Trash2, AlertTriangle, User, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { RejectDialog } from "@/components/reject-dialog";
import { ProofThumb } from "@/components/proof-image";
import { Linkified } from "@/lib/linkify";
import { friendlyError } from "@/lib/friendly-error";
import { TutorialButton } from "@/components/tutorial-button";

const PUBLISHER_REJECT_PRESETS = [
  "Proof is invalid or fake",
  "Task instructions not followed",
  "Incomplete proof",
  "Duplicate submission",
  "Low quality submission",
];

export const Route = createFileRoute("/app/publish")({
  head: () => ({ meta: [{ title: "Publish Task — AxoraBD" }] }),
  staticData: { title: "Publish Task" },
  component: PublishPage,
});

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
  const [showPublisher, setShowPublisher] = useState(true);
  const [rejectSub, setRejectSub] = useState<any | null>(null);
  const [cancelTask, setCancelTask] = useState<any | null>(null);
  const [viewSub, setViewSub] = useState<any | null>(null);

  async function confirmCancelTask() {
    if (!cancelTask) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("publisher_cancel_task", { p_task_id: cancelTask.id });
    setBusy(false);
    if (error) { toast.error(friendlyError(error)); return; }
    const refunded = Number((data as any)?.refunded ?? 0);
    toast.success(refunded > 0 ? `Task cancelled. ৳${refunded.toFixed(2)} refunded to your balance.` : "Task cancelled. No refund (task was already active).");
    setCancelTask(null);
    // refresh list
    const { data: ts } = await supabase.from("tasks").select("*").eq("publisher_id", session?.user?.id ?? "").order("created_at", { ascending: false });
    setTasks(ts ?? []);
  }


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
  const minPublishAmount = Number(settings?.minimum_task_publish_amount ?? 0);
  const minTaskTotal = Number(settings?.minimum_task_total_amount ?? 0);
  const belowMinPublish = minPublishAmount > 0 && balance < minPublishAmount;
  const belowMinTaskTotal = minTaskTotal > 0 && subtotal > 0 && subtotal < minTaskTotal;
  const insufficient = totalCost > balance;

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !profile) return;
    if (belowMinPublish) { toast.error(`You need at least ৳${minPublishAmount.toFixed(2)} balance to publish a task`); return; }
    if (belowMinTaskTotal) { toast.error(`Task total (reward × slots) must be at least ৳${minTaskTotal.toFixed(2)}`); return; }
    if (insufficient) { toast.error("Insufficient balance to publish this task"); return; }
    if ((profile as any).publisher_restricted) { toast.error("Publisher access is restricted"); return; }
    setBusy(true);
    try {
      // Verify profile exists (backend validation)
      const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!prof) { toast.error("Your profile is missing. Please re-login."); setBusy(false); return; }

      // Validate proof fields
      const cleanFields = proofFields.filter(f => f.label.trim().length > 0);
      if (cleanFields.length === 0) { toast.error("Add at least one proof requirement"); setBusy(false); return; }

      // Upload banner if present
      let banner_url: string | null = null;
      if (bannerFile) {
        if (bannerFile.size > 5 * 1024 * 1024) { toast.error("Banner must be under 5MB"); setBusy(false); return; }
        if (!bannerFile.type.startsWith("image/")) { toast.error("Banner must be an image"); setBusy(false); return; }
        const path = `${session.user.id}/${Date.now()}-${bannerFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("task-banners").upload(path, bannerFile);
        if (upErr) { toast.error(friendlyError(upErr)); setBusy(false); return; }
        banner_url = supabase.storage.from("task-banners").getPublicUrl(path).data.publicUrl;
      }

      const primaryProofType = cleanFields.find(f => f.type === "image")?.type ?? cleanFields[0].type;
      const proofCount = cleanFields.filter(f => f.type === "image").length || 1;

      const { data: newTaskId, error } = await supabase.rpc("publish_task_with_charge", {
        p_title: form.title,
        p_description: form.description,
        p_instructions: form.instructions,
        p_category: form.category,
        p_reward: reward,
        p_total_slots: slots,
        p_proof_type: primaryProofType,
        p_proof_count: proofCount,
        p_proof_fields: cleanFields as any,
        p_banner_url: banner_url ?? "",
      });
      if (error || !newTaskId) { toast.error(friendlyError(error, "Failed to publish")); setBusy(false); return; }

      // Persist publisher visibility preference on the freshly-created task.
      if (!showPublisher) {
        await (supabase as any).from("tasks").update({ show_publisher: false }).eq("id", newTaskId);
      }

      toast.success("Task submitted for admin review!");
      setForm({ title: "", description: "", instructions: "", category: "general", reward: "", total_slots: "1" });
      setBannerFile(null); setBannerPreview(null);
      setShowPublisher(true);
      setProofFields([{ id: crypto.randomUUID(), type: "image", label: "Proof screenshot", required: true }]);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to publish"));
    } finally {
      setBusy(false);
    }
  };


  const reviewSub = async (subId: string, approve: boolean, _taskId: string, userId: string, taskReward: number, reason?: string) => {
    let proofPaths: string[] = [];
    if (approve) {
      const { data: proofs } = await supabase
        .from("task_submission_proofs")
        .select("image_url")
        .eq("submission_id", subId);
      proofPaths = (proofs ?? [])
        .map((p: any) => {
          const url: string = p.image_url ?? "";
          const idx = url.indexOf("/proofs/");
          if (idx >= 0) return url.substring(idx + 8);
          return url.replace(/^\/+/, "");
        })
        .filter(Boolean);
    }

    const { error } = await supabase.rpc("publisher_review_submission" as any, {
      p_submission_id: subId,
      p_approve: approve,
      p_reason: reason ?? null,
    });
    if (error) { toast.error(friendlyError(error)); return; }

    if (approve && proofPaths.length > 0) {
      await supabase.storage.from("proofs").remove(proofPaths);
    }

    await supabase.from("notifications").insert({
      user_id: userId,
      title: approve ? "Submission approved" : "Submission rejected",
      message: approve ? `You earned ৳${taskReward.toFixed(2)}` : `Your submission was rejected by the publisher. Reason: ${reason ?? "No reason provided"}`,
      type: approve ? "submission_approved" : "submission_rejected",
    });
    toast.success(approve ? "Approved & user paid" : "Rejected");
    setRejectSub(null);
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
    <>
      <div className="mb-4 flex justify-end"><TutorialButton sectionKey="publish" /></div>
      <div className="relative">
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
                  {/* Banner upload */}
                  <div className="space-y-2">
                    <Label>Task banner / thumbnail (optional, max 5MB)</Label>
                    {bannerPreview ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border bg-accent/30">
                        <img src={bannerPreview} alt="banner preview" className="absolute inset-0 w-full h-full object-cover" />
                        <Button type="button" size="sm" variant="destructive" className="absolute top-2 right-2"
                          onClick={() => { setBannerFile(null); setBannerPreview(null); }}>Remove</Button>
                      </div>
                    ) : (
                      <label
                        htmlFor="banner-input"
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary","bg-primary/5"); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary","bg-primary/5"); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("border-primary","bg-primary/5");
                          const f = e.dataTransfer.files?.[0]; if (!f) return;
                          if (!f.type.startsWith("image/")) { toast.error("Banner must be an image"); return; }
                          if (f.size > 5 * 1024 * 1024) { toast.error("Banner must be under 5MB"); return; }
                          setBannerFile(f); setBannerPreview(URL.createObjectURL(f));
                        }}
                        className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors text-center px-4"
                      >
                        <Megaphone className="h-8 w-8 text-muted-foreground/60 mb-2" />
                        <p className="text-sm font-medium">Drag & drop an image here</p>
                        <p className="text-xs text-muted-foreground mt-1">or click to browse · 16:9 recommended · max 5MB</p>
                        <input id="banner-input" type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          if (f.size > 5 * 1024 * 1024) { toast.error("Banner must be under 5MB"); return; }
                          setBannerFile(f); setBannerPreview(URL.createObjectURL(f));
                        }} />
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Reward / slot (৳)</Label>
                      <Input type="number" step="0.01" min="0.01" value={form.reward}
                        onChange={(e) => setForm(f => ({ ...f, reward: e.target.value }))} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Total slots</Label>
                    <Input type="number" min="1" value={form.total_slots}
                      onChange={(e) => setForm(f => ({ ...f, total_slots: e.target.value }))} required /></div>

                  {/* Dynamic proof fields */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Proof requirements</Label>
                      <Button type="button" size="sm" variant="outline" onClick={() =>
                        setProofFields(p => [...p, { id: crypto.randomUUID(), type: "text", label: "", required: true }])
                      }><Plus className="h-3 w-3" /> Add field</Button>
                    </div>
                    <div className="space-y-2">
                      {proofFields.map((field, idx) => (
                        <div key={field.id} className="flex gap-2 items-start p-3 rounded-lg bg-accent/30 border border-border">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <Input placeholder="Field label (e.g. Your TikTok URL)" value={field.label}
                              onChange={(e) => setProofFields(p => p.map(f => f.id === field.id ? { ...f, label: e.target.value } : f))} />
                            <Select value={field.type} onValueChange={(v) =>
                              setProofFields(p => p.map(f => f.id === field.id ? { ...f, type: v } : f))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PROOF_FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {proofFields.length > 1 && (
                            <Button type="button" size="icon" variant="ghost"
                              onClick={() => setProofFields(p => p.filter(f => f.id !== field.id))}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Publisher visibility toggle */}
                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-accent/30 border border-border">
                    <div className="min-w-0">
                      <Label htmlFor="show-publisher" className="text-sm">Show my profile on this task</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {showPublisher
                          ? `Workers will see @${(profile as any)?.username ?? "your username"} on the task card.`
                          : "Your identity will be hidden. The task will appear as Anonymous."}
                      </p>
                    </div>
                    <Switch id="show-publisher" checked={showPublisher} onCheckedChange={setShowPublisher} />
                  </div>




                  <div className="rounded-xl bg-accent/40 border border-border p-4 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Platform tax ({taxPct}%)</span><span>৳{tax.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold border-t border-border pt-2 mt-1"><span>Total cost</span><span>৳{totalCost.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Your balance</span>
                      <span className={insufficient ? "text-destructive" : "text-success"}>৳{balance.toFixed(2)}</span></div>
                  </div>

                  <Button type="submit" disabled={busy || belowMinPublish || belowMinTaskTotal || insufficient || !form.reward || !form.total_slots}
                    className="w-full bg-gradient-to-r from-primary to-primary/80">
                    {busy ? "Publishing…" : belowMinPublish ? `Need ৳${minPublishAmount.toFixed(2)} min. balance` : belowMinTaskTotal ? `Min. task total ৳${minTaskTotal.toFixed(2)}` : insufficient ? "Insufficient balance" : `Publish task (৳${totalCost.toFixed(2)})`}
                  </Button>
                  {belowMinPublish && (
                    <p className="text-xs text-center text-destructive">
                      You need at least ৳{minPublishAmount.toFixed(2)} balance to publish a task. <Link to="/app/deposit" className="text-primary hover:underline">Deposit funds</Link>
                    </p>
                  )}
                  {belowMinTaskTotal && !belowMinPublish && (
                    <p className="text-xs text-center text-destructive">
                      Task total (reward × slots) must be at least ৳{minTaskTotal.toFixed(2)}.
                    </p>
                  )}
                  {insufficient && !belowMinPublish && (
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
                          ৳{Number(t.reward).toFixed(2)} · {t.completed_slots}/{t.total_slots} slots ·
                          Created {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">৳{(Number(t.reward) * t.completed_slots).toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">paid out</p>
                      </div>
                      {!["completed", "rejected", "cancelled"].includes(t.status) && (
                        <div className="w-full flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setCancelTask(t)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Cancel task
                          </Button>
                        </div>
                      )}
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
                    <Card key={s.id}
                      onClick={() => setViewSub({ ...s, _reward: Number(task?.reward ?? 0) })}
                      className="cursor-pointer hover:border-primary/40 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{s.tasks?.title ?? task?.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-warning/20 text-warning border-warning/30">Pending</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        {s.proof_text && <p className="text-xs bg-accent/40 p-2 rounded mb-3 whitespace-pre-wrap line-clamp-2">{s.proof_text}</p>}
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" onClick={() => reviewSub(s.id, true, s.task_id, s.user_id, Number(task?.reward ?? 0))}
                            className="bg-success text-success-foreground hover:bg-success/90">
                            <CheckCircle2 className="h-4 w-4" /> Approve & Pay
                          </Button>
                          <Button size="sm" variant="destructive"
                            onClick={() => setRejectSub({ ...s, _reward: Number(task?.reward ?? 0) })}>
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
                <p className="text-3xl font-bold mt-1 text-warning">৳{stats.spent.toFixed(2)}</p>
              </CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <RejectDialog
        open={!!rejectSub}
        title="Reject submission?"
        description="Select a reason or write a custom message. The user will see this reason."
        presets={PUBLISHER_REJECT_PRESETS}
        onCancel={() => setRejectSub(null)}
        onConfirm={(reason) => rejectSub && reviewSub(rejectSub.id, false, rejectSub.task_id, rejectSub.user_id, rejectSub._reward, reason)}
      />
      <AlertDialog open={!!cancelTask} onOpenChange={(o) => !o && setCancelTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Cancel "{cancelTask?.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {cancelTask?.status === "pending" ? (
                  <p className="text-success">
                    ✓ This task is still pending review. Your full payment will be refunded to your balance.
                  </p>
                ) : (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-destructive">
                    <p className="font-semibold mb-1">⚠ Warning: No refund</p>
                    <p>
                      This task is already <b>{cancelTask?.status}</b> and workers can submit proofs.
                      If you cancel now, <b>you will NOT get any refund</b> for the remaining slots.
                      Unused funds will be lost.
                    </p>
                  </div>
                )}
                <p className="text-muted-foreground text-xs">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep task</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelTask} className="bg-destructive hover:bg-destructive/90">
              {cancelTask?.status === "pending" ? "Cancel & refund" : "Cancel without refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SubmissionDetailDialog
        sub={viewSub}
        task={viewSub ? tasks.find(t => t.id === viewSub.task_id) : null}
        onClose={() => setViewSub(null)}
        onApprove={() => { if (viewSub) { reviewSub(viewSub.id, true, viewSub.task_id, viewSub.user_id, viewSub._reward); setViewSub(null); } }}
        onReject={() => { if (viewSub) { setRejectSub(viewSub); setViewSub(null); } }}
      />
    </>
  );
}

function SubmissionDetailDialog({ sub, task, onClose, onApprove, onReject }: {
  sub: any | null; task: any | null; onClose: () => void; onApprove: () => void; onReject: () => void;
}) {
  const [proofs, setProofs] = useState<any[]>([]);
  const [submitter, setSubmitter] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sub) { setProofs([]); setSubmitter(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [p, u] = await Promise.all([
        supabase.from("task_submission_proofs").select("*").eq("submission_id", sub.id),
        supabase.from("profiles").select("username, avatar_url, full_name, trust_score").eq("user_id", sub.user_id).maybeSingle(),
      ]);
      if (cancelled) return;
      setProofs(p.data ?? []);
      setSubmitter(u.data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sub?.id]);

  if (!sub) return null;
  const proofFields: any[] = Array.isArray(task?.proof_fields) ? task.proof_fields : [];

  return (
    <Dialog open={!!sub} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg pr-6">{task?.title ?? sub.tasks?.title ?? "Submission"}</DialogTitle>
          <DialogDescription>
            Submitted {new Date(sub.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/40 border border-border">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
            {submitter?.avatar_url ? (
              <img src={submitter.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : <User className="h-5 w-5 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">@{submitter?.username ?? "user"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {submitter?.full_name ?? "—"} · Trust {submitter?.trust_score ?? "—"}
            </p>
          </div>
          <Badge className="bg-warning/20 text-warning border-warning/30">Pending</Badge>
        </div>

        {task?.instructions && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Task instructions</p>
            <div className="text-xs p-3 rounded-lg bg-muted/40 border border-border max-h-32 overflow-y-auto">
              <Linkified text={task.instructions} className="block" />
            </div>
          </div>
        )}

        {proofFields.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Required proof</p>
            <ul className="text-xs space-y-1">
              {proofFields.map((f) => (
                <li key={f.id} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{f.type}</Badge>
                  <span>{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">User's submission</p>
          {sub.proof_text ? (
            <div className="text-sm p-3 rounded-lg bg-accent/40 border border-border whitespace-pre-wrap">
              <Linkified text={sub.proof_text} className="block" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No text proof provided.</p>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Screenshots ({proofs.length})
          </p>
          {loading ? (
            <div className="h-32 rounded-lg bg-muted animate-pulse" />
          ) : proofs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No screenshots uploaded.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {proofs.map((p) => (
                <ProofThumb key={p.id} src={p.image_url}
                  className="w-full h-40 object-cover rounded-lg border border-border hover:opacity-90 transition" />
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">Tap any image to open full size.</p>
        </div>

        <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-1">
          <Button onClick={onApprove} className="flex-1 bg-success text-success-foreground hover:bg-success/90">
            <CheckCircle2 className="h-4 w-4" /> Approve & Pay ৳{Number(sub._reward ?? 0).toFixed(2)}
          </Button>
          <Button onClick={onReject} variant="destructive" className="flex-1">
            <XCircle className="h-4 w-4" /> Reject
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
