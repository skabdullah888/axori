import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Ban, AlertTriangle, ShieldCheck, Pause, Play, Pencil, Trash2,
  Eye, Star, X, FileCheck2, Users2, BarChart3, ChevronLeft,
} from "lucide-react";
import { fmtDate, fmtMoney, StatusPill, notify } from "@/lib/admin-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog, RejectDialog } from "@/components/reject-dialog";
import { cn } from "@/lib/utils";
import { ProofThumb } from "@/components/proof-image";

export const Route = createFileRoute("/skabdullah_999_sg/admin/publishers")({
  head: () => ({ meta: [{ title: "Admin Publishers — AxoraBD" }] }),
  component: PublishersPage,
});

type Publisher = {
  id: string;
  user_id: string | null;
  username: string;
  email: string | null;
  avatar_url: string | null;
  status: string;
  publisher_restricted: boolean;
  taskCount: number;
  activeCount: number;
  approved: number;
  rejected: number;
  totalSubs: number;
};

type TaskFilter = "all" | "active" | "paused" | "completed" | "pending" | "rejected";

function PublishersPage() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [selectedPub, setSelectedPub] = useState<Publisher | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [taskSort, setTaskSort] = useState<"newest" | "oldest" | "reward">("newest");
  const [mobileView, setMobileView] = useState<"pubs" | "tasks" | "details">("pubs");

  // Dialogs
  const [editTask, setEditTask] = useState<any | null>(null);
  const [deleteTask, setDeleteTask] = useState<any | null>(null);
  const [rejectTask, setRejectTask] = useState<any | null>(null);
  const [warnPub, setWarnPub] = useState<Publisher | null>(null);
  const [banPub, setBanPub] = useState<Publisher | null>(null);
  const [submissionsDialog, setSubmissionsDialog] = useState<any | null>(null);
  const [proofsDialog, setProofsDialog] = useState<any | null>(null);

  const loadPublishers = async () => {
    const { data: tasksData } = await supabase.from("tasks").select("publisher_id, status");
    const publisherIds = Array.from(new Set((tasksData ?? []).map(t => t.publisher_id).filter((x): x is string => !!x)));
    if (publisherIds.length === 0) { setPublishers([]); return; }

    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", publisherIds);
    const { data: subs } = await supabase.from("task_submissions").select("status, task:tasks(publisher_id)");

    const stats: Record<string, { total: number; rejected: number; approved: number }> = {};
    (subs ?? []).forEach((s: any) => {
      const pid = s.task?.publisher_id;
      if (!pid) return;
      stats[pid] = stats[pid] ?? { total: 0, rejected: 0, approved: 0 };
      stats[pid].total++;
      if (s.status === "rejected") stats[pid].rejected++;
      if (s.status === "approved") stats[pid].approved++;
    });

    const counts: Record<string, { total: number; active: number }> = {};
    (tasksData ?? []).forEach(t => {
      if (!t.publisher_id) return;
      counts[t.publisher_id] = counts[t.publisher_id] ?? { total: 0, active: 0 };
      counts[t.publisher_id].total++;
      if (t.status === "active") counts[t.publisher_id].active++;
    });

    const rows: Publisher[] = (profiles ?? []).map((p: any) => {
      const key = p.user_id;
      return {
        id: p.id,
        user_id: p.user_id,
        username: p.username,
        email: p.email,
        avatar_url: p.avatar_url,
        status: p.status,
        publisher_restricted: p.publisher_restricted,
        taskCount: counts[key]?.total ?? 0,
        activeCount: counts[key]?.active ?? 0,
        approved: stats[key]?.approved ?? 0,
        rejected: stats[key]?.rejected ?? 0,
        totalSubs: stats[key]?.total ?? 0,
      };
    }).sort((a, b) => b.taskCount - a.taskCount);

    setPublishers(rows);
    if (selectedPub) {
      const updated = rows.find(r => r.id === selectedPub.id);
      if (updated) setSelectedPub(updated);
    }
  };

  const loadTasks = async (publisherUserId: string) => {
    const { data } = await supabase.from("tasks")
      .select("*")
      .eq("publisher_id", publisherUserId)
      .order("created_at", { ascending: false });
    setTasks(data ?? []);
    if (selectedTask) {
      const updated = (data ?? []).find((t: any) => t.id === selectedTask.id);
      setSelectedTask(updated ?? null);
    }
  };

  useEffect(() => { loadPublishers(); }, []);
  useEffect(() => {
    if (selectedPub?.user_id) loadTasks(selectedPub.user_id);
    else { setTasks([]); setSelectedTask(null); }
  }, [selectedPub?.user_id]);

  useEffect(() => {
    const ch = supabase.channel("admin-pub-tasks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadPublishers();
        if (selectedPub?.user_id) loadTasks(selectedPub.user_id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedPub?.user_id]);

  const filteredPubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return publishers;
    return publishers.filter(p =>
      p.username.toLowerCase().includes(q) || (p.email ?? "").toLowerCase().includes(q),
    );
  }, [publishers, search]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (taskFilter !== "all") list = list.filter(t => t.status === taskFilter);
    if (taskSort === "oldest") list = [...list].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    else if (taskSort === "reward") list = [...list].sort((a, b) => Number(b.reward) - Number(a.reward));
    return list;
  }, [tasks, taskFilter, taskSort]);

  // === Actions ===
  const setTaskStatus = async (task: any, status: string, label: string) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    await notify(task.publisher_id, "system", `Task ${label}`, `Your task "${task.title}" was ${label} by an administrator.`);
    toast.success(`Task ${label}`);
  };

  const doDeleteTask = async () => {
    if (!deleteTask) return;
    const { error } = await supabase.from("tasks").delete().eq("id", deleteTask.id);
    if (error) { toast.error(error.message); return; }
    await notify(deleteTask.publisher_id, "system", "Task deleted", `Your task "${deleteTask.title}" was deleted by an administrator.`);
    toast.success("Task deleted");
    setSelectedTask(null);
    setDeleteTask(null);
  };

  const doRejectTask = async (reason: string) => {
    if (!rejectTask) return;
    const { error } = await supabase.from("tasks").update({ status: "rejected" }).eq("id", rejectTask.id);
    if (error) { toast.error(error.message); return; }
    await notify(rejectTask.publisher_id, "system", "Task rejected", `Your task "${rejectTask.title}" was rejected. Reason: ${reason}`);
    toast.success("Task rejected");
    setRejectTask(null);
  };

  const doWarn = async (reason: string) => {
    if (!warnPub) return;
    await notify(warnPub.user_id, "system", "⚠️ Warning from admin", reason);
    toast.success("Warning sent");
    setWarnPub(null);
  };

  const doBan = async () => {
    if (!banPub) return;
    const { error } = await supabase.from("profiles").update({ status: "banned" }).eq("id", banPub.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Publisher banned");
    setBanPub(null);
    loadPublishers();
  };

  const toggleRestrict = async (p: Publisher) => {
    const { error } = await supabase.from("profiles")
      .update({ publisher_restricted: !p.publisher_restricted }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(p.publisher_restricted ? "Restriction lifted" : "Publisher restricted");
    loadPublishers();
  };

  const toggleFeature = async (task: any) => {
    const featured = !(task.category === "featured");
    const newCat = featured ? "featured" : "general";
    const { error } = await supabase.from("tasks").update({ category: newCat }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    toast.success(featured ? "Task featured" : "Feature removed");
  };

  return (
    <AdminShell title="Publishers">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_380px] gap-4 h-[calc(100vh-7rem)]">

        {/* === LEFT: Publishers list === */}
        <Card className={cn("flex flex-col overflow-hidden", mobileView !== "pubs" && "hidden lg:flex")}>
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users2 className="h-4 w-4" /> Publishers
              <Badge variant="secondary" className="ml-auto">{publishers.length}</Badge>
            </div>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPubs.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-10">No publishers</p>
            ) : filteredPubs.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPub(p); setSelectedTask(null); setMobileView("tasks"); }}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b border-border hover:bg-accent/40 transition-colors",
                  selectedPub?.id === p.id && "bg-accent/60",
                )}
              >
                <div className="flex items-center gap-2">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      {p.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{p.username}</p>
                      {p.publisher_restricted && <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span>{p.taskCount} tasks</span>
                      <span>•</span>
                      <span className={cn(
                        "capitalize",
                        p.status === "active" && "text-success",
                        p.status === "banned" && "text-destructive",
                      )}>{p.status}</span>
                    </div>
                  </div>
                  {p.activeCount > 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">{p.activeCount}</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* === MIDDLE: Tasks list === */}
        <Card className={cn("flex flex-col overflow-hidden", mobileView !== "tasks" && "hidden lg:flex")}>
          {!selectedPub ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              Select a publisher to see their tasks
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setMobileView("pubs")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedPub.username}'s Tasks</p>
                    <p className="text-[11px] text-muted-foreground">{selectedPub.email}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setWarnPub(selectedPub)}>
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />Warn
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toggleRestrict(selectedPub)}>
                    {selectedPub.publisher_restricted ? <ShieldCheck className="h-3.5 w-3.5 mr-1" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                    {selectedPub.publisher_restricted ? "Unrestrict" : "Restrict"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setBanPub(selectedPub)}>
                    <Ban className="h-3.5 w-3.5 mr-1" />Ban
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Stat label="Total" value={selectedPub.taskCount} />
                  <Stat label="Active" value={selectedPub.activeCount} />
                  <Stat label="Approved" value={selectedPub.approved} />
                  <Stat label="Rejected" value={selectedPub.rejected} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "active", "paused", "completed", "pending", "rejected"] as TaskFilter[]).map(f => (
                    <Button key={f} size="sm" variant={taskFilter === f ? "default" : "secondary"}
                      onClick={() => setTaskFilter(f)} className="h-7 text-[11px] px-2 capitalize">
                      {f}
                    </Button>
                  ))}
                  <select value={taskSort} onChange={e => setTaskSort(e.target.value as any)}
                    className="ml-auto bg-background border border-border rounded-md text-[11px] px-2 h-7">
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="reward">Top reward</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredTasks.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-10">No tasks</p>
                ) : filteredTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTask(t); setMobileView("details"); }}
                    className={cn(
                      "w-full text-left rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors p-3",
                      selectedTask?.id === t.id && "ring-2 ring-primary border-primary",
                    )}
                  >
                    <div className="flex gap-3">
                      {t.banner_url && (
                        <img src={t.banner_url} alt="" className="h-14 w-14 rounded-md object-cover border border-border shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-medium truncate flex-1">{t.title}</p>
                          {t.category === "featured" && <Star className="h-3.5 w-3.5 text-warning fill-warning shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusPill status={t.status} />
                          <span className="text-[11px] text-muted-foreground">{fmtMoney(t.reward)}</span>
                          <span className="text-[11px] text-muted-foreground">{t.completed_slots}/{t.total_slots} slots</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* === RIGHT: Task details === */}
        <Card className={cn("flex flex-col overflow-hidden", mobileView !== "details" && "hidden lg:flex")}>
          {!selectedTask ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              Select a task to see full details
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setMobileView("tasks")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm font-semibold flex-1">Task Details</p>
                <StatusPill status={selectedTask.status} />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
                {selectedTask.banner_url && (
                  <img src={selectedTask.banner_url} alt="" className="w-full rounded-lg border border-border max-h-44 object-cover" />
                )}
                <div>
                  <h3 className="text-base font-semibold">{selectedTask.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Created {fmtDate(selectedTask.created_at)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <DetailBox label="Reward" value={fmtMoney(selectedTask.reward)} />
                  <DetailBox label="Slots" value={`${selectedTask.completed_slots} / ${selectedTask.total_slots}`} />
                  <DetailBox label="Category" value={selectedTask.category ?? "general"} />
                  <DetailBox label="Proof" value={`${selectedTask.proof_type ?? "—"} ×${selectedTask.proof_count ?? 1}`} />
                  {selectedTask.deadline && <DetailBox label="Deadline" value={fmtDate(selectedTask.deadline)} />}
                </div>
                {selectedTask.description && (
                  <DetailSection title="Description">
                    <p className="whitespace-pre-wrap text-muted-foreground text-xs">{selectedTask.description}</p>
                  </DetailSection>
                )}
                {selectedTask.instructions && (
                  <DetailSection title="Instructions">
                    <p className="whitespace-pre-wrap text-muted-foreground text-xs">{selectedTask.instructions}</p>
                  </DetailSection>
                )}
                {Array.isArray(selectedTask.proof_fields) && selectedTask.proof_fields.length > 0 && (
                  <DetailSection title="Proof requirements">
                    <ul className="space-y-1">
                      {selectedTask.proof_fields.map((f: any, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                          <span>{f.label}</span>
                          {f.required && <span className="text-[10px] text-destructive">required</span>}
                        </li>
                      ))}
                    </ul>
                  </DetailSection>
                )}
                <SubmissionStats taskId={selectedTask.id} />
              </div>
              {/* Admin actions */}
              <div className="border-t border-border p-3 grid grid-cols-2 gap-2">
                {selectedTask.status === "active" && (
                  <Button size="sm" variant="secondary" onClick={() => setTaskStatus(selectedTask, "paused", "paused")}>
                    <Pause className="h-3.5 w-3.5 mr-1" />Pause
                  </Button>
                )}
                {selectedTask.status === "paused" && (
                  <Button size="sm" onClick={() => setTaskStatus(selectedTask, "active", "resumed")}>
                    <Play className="h-3.5 w-3.5 mr-1" />Resume
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setEditTask(selectedTask)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleFeature(selectedTask)}>
                  <Star className="h-3.5 w-3.5 mr-1" />{selectedTask.category === "featured" ? "Unfeature" : "Feature"}
                </Button>
                {selectedTask.status !== "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => setRejectTask(selectedTask)}>
                    <X className="h-3.5 w-3.5 mr-1" />Reject
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setSubmissionsDialog(selectedTask)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />Submissions
                </Button>
                <Button size="sm" variant="outline" onClick={() => setProofsDialog(selectedTask)}>
                  <FileCheck2 className="h-3.5 w-3.5 mr-1" />Proofs
                </Button>
                <Button size="sm" variant="destructive" className="col-span-2" onClick={() => setDeleteTask(selectedTask)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Delete Task
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Edit dialog */}
      <EditTaskDialog task={editTask} onClose={() => setEditTask(null)} onSaved={() => { setEditTask(null); if (selectedPub) loadTasks(selectedPub.id); }} />

      {/* Submissions dialog */}
      <SubmissionsDialog task={submissionsDialog} onClose={() => setSubmissionsDialog(null)} />
      <ProofsDialog task={proofsDialog} onClose={() => setProofsDialog(null)} />

      <ConfirmDialog
        open={!!deleteTask}
        title="Delete task?"
        description={deleteTask ? `"${deleteTask.title}" will be permanently removed. This cannot be undone.` : ""}
        confirmLabel="Delete"
        onCancel={() => setDeleteTask(null)}
        onConfirm={doDeleteTask}
      />
      <RejectDialog
        open={!!rejectTask}
        title="Reject this task?"
        description="Select a reason or write a custom message. The publisher will be notified."
        presets={["Violates platform rules", "Spam or low quality", "Misleading task", "Duplicate task", "Reward too low"]}
        onCancel={() => setRejectTask(null)}
        onConfirm={doRejectTask}
      />
      <RejectDialog
        open={!!warnPub}
        title={`Warn ${warnPub?.username ?? ""}`}
        description="The publisher will receive this warning as a notification."
        presets={["Low-quality tasks", "Unfair rejections of submissions", "Suspicious activity detected", "Please follow platform guidelines"]}
        onCancel={() => setWarnPub(null)}
        onConfirm={doWarn}
      />
      <ConfirmDialog
        open={!!banPub}
        title="Ban publisher?"
        description={banPub ? `${banPub.username} will be banned and lose access to the platform.` : ""}
        confirmLabel="Ban"
        onCancel={() => setBanPub(null)}
        onConfirm={doBan}
      />
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <p className="text-base font-semibold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5 break-all">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">{title}</p>
      {children}
    </div>
  );
}

function SubmissionStats({ taskId }: { taskId: string }) {
  const [stats, setStats] = useState<{ total: number; pending: number; approved: number; rejected: number } | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("task_submissions").select("status").eq("task_id", taskId);
      const s = { total: 0, pending: 0, approved: 0, rejected: 0 };
      (data ?? []).forEach((r: any) => {
        s.total++;
        if (r.status === "pending") s.pending++;
        else if (r.status === "approved") s.approved++;
        else if (r.status === "rejected") s.rejected++;
      });
      setStats(s);
    })();
  }, [taskId]);
  if (!stats) return null;
  return (
    <DetailSection title={<span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Submission stats</span>}>
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Total" value={stats.total} />
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Rejected" value={stats.rejected} />
      </div>
    </DetailSection>
  );
}

function EditTaskDialog({ task, onClose, onSaved }: { task: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", instructions: "", reward: "", total_slots: "" });
  useEffect(() => {
    if (task) setForm({
      title: task.title ?? "",
      description: task.description ?? "",
      instructions: task.instructions ?? "",
      reward: String(task.reward ?? ""),
      total_slots: String(task.total_slots ?? ""),
    });
  }, [task]);

  const save = async () => {
    if (!task) return;
    const { error } = await supabase.from("tasks").update({
      title: form.title,
      description: form.description,
      instructions: form.instructions,
      reward: Number(form.reward) || 0,
      total_slots: Number(form.total_slots) || 1,
    }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    await notify(task.publisher_id, "system", "Task updated", `Your task "${form.title}" was edited by an administrator.`);
    toast.success("Task updated");
    onSaved();
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Instructions</Label><Textarea rows={3} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Reward</Label><Input type="number" step="0.01" value={form.reward} onChange={e => setForm({ ...form, reward: e.target.value })} /></div>
            <div><Label>Total slots</Label><Input type="number" value={form.total_slots} onChange={e => setForm({ ...form, total_slots: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionsDialog({ task, onClose }: { task: any | null; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!task) return;
    (async () => {
      const { data: subs } = await supabase.from("task_submissions").select("*")
        .eq("task_id", task.id).order("created_at", { ascending: false });
      const userIds = Array.from(new Set((subs ?? []).map((s: any) => s.user_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id,username,email").in("user_id", userIds);
        (profs ?? []).forEach((p: any) => { profilesMap[p.user_id] = p; });
      }
      setRows((subs ?? []).map((s: any) => ({ ...s, user: profilesMap[s.user_id] })));
    })();
  }, [task]);
  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Submissions — {task?.title}</DialogTitle></DialogHeader>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No submissions yet</p> : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="border border-border rounded-md p-3 text-sm flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{r.user?.username ?? r.user_id?.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p>
                  {r.proof_text && <p className="text-xs mt-1 line-clamp-2">{r.proof_text}</p>}
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProofsDialog({ task, onClose }: { task: any | null; onClose: () => void }) {
  const [proofs, setProofs] = useState<any[]>([]);
  useEffect(() => {
    if (!task) return;
    (async () => {
      const { data: subs } = await supabase.from("task_submissions").select("id").eq("task_id", task.id);
      const ids = (subs ?? []).map((s: any) => s.id);
      if (ids.length === 0) { setProofs([]); return; }
      const { data } = await supabase.from("task_submission_proofs").select("*").in("submission_id", ids).order("created_at", { ascending: false });
      setProofs(data ?? []);
    })();
  }, [task]);
  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Proofs — {task?.title}</DialogTitle></DialogHeader>
        {proofs.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No proofs uploaded</p> : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {proofs.map(p => (
              <a key={p.id} href={p.image_url} target="_blank" rel="noreferrer" className="block group">
                <img src={p.image_url} alt="" className="w-full h-32 object-cover rounded-md border border-border group-hover:border-primary transition-colors" />
                <p className="text-[10px] text-muted-foreground mt-1">{fmtDate(p.created_at)}</p>
              </a>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
