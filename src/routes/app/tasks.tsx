import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Clock, Coins, Users2, ListTodo, Lock, ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserShell } from "@/components/user-shell";
import { ActivationRequiredDialog } from "@/components/activation-required-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/tasks")({ component: TasksPage });

type ProofField = { id: string; type: string; label: string; required: boolean };

function TasksPage() {
  const { session } = useAuth();
  const { isActive } = useProfile();
  const [tasks, setTasks] = useState<any[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<string>("new");
  const [selected, setSelected] = useState<any>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*, publisher:profiles!tasks_publisher_id_fkey(username, avatar_url)")
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

  const openDetails = (t: any) => { setSelected(t); };
  const openSubmit = () => {
    if (!isActive) { setActivationOpen(true); return; }
    if (selected?.publisher_id === session?.user?.id) { toast.error("You cannot submit to your own task"); return; }
    setSubmitOpen(true);
  };

  return (
    <UserShell title="Browse Tasks">
      <ActivationRequiredDialog open={activationOpen} onOpenChange={setActivationOpen} />
      <div className="relative">
        {!isActive && (
          <div className="mb-5 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-3">
            <Lock className="h-5 w-5 text-warning shrink-0" />
            <p className="text-sm">
              Your account is <span className="font-semibold text-warning">inactive</span>. You can browse tasks, but you must activate to submit.{" "}
              <Link to="/app/profile" className="underline font-medium">Activate now</Link>
            </p>
          </div>
        )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const submitted = mine.has(t.id);
              const remaining = t.total_slots - t.completed_slots;
              return (
                <Card key={t.id} onClick={() => openDetails(t)}
                  className="group overflow-hidden cursor-pointer border-border/60 hover:border-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/30 overflow-hidden flex items-center justify-center">
                    {t.banner_url ? (
                      <img src={t.banner_url} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{t.category ?? "general"}</Badge>
                      <div className="flex items-center gap-1 text-primary font-bold">
                        <Coins className="h-4 w-4" />৳{Number(t.reward).toFixed(2)}
                      </div>
                    </div>
                    <h3 className="font-semibold line-clamp-1 mb-1">{t.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users2 className="h-3 w-3" /> {remaining}/{t.total_slots}</span>
                      <span className="truncate ml-2">@{t.publisher?.username ?? "—"}</span>
                    </div>
                    {submitted && <Badge className="mt-2 bg-success/20 text-success border-success/30 text-[10px]">Submitted</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Task details modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              {selected.banner_url && (
                <img src={selected.banner_url} alt="" className="w-full max-h-56 object-cover rounded-lg -mt-2" />
              )}
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase">{selected.category}</Badge>
                  <Badge className="bg-success/20 text-success border-success/30 text-[10px]">{selected.status}</Badge>
                </div>
                <DialogTitle className="text-xl">{selected.title}</DialogTitle>
                <DialogDescription>by @{selected.publisher?.username ?? "—"}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-accent/30 border border-border">
                  <p className="text-[10px] uppercase text-muted-foreground">Reward</p>
                  <p className="font-bold text-primary">৳{Number(selected.reward).toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/30 border border-border">
                  <p className="text-[10px] uppercase text-muted-foreground">Slots left</p>
                  <p className="font-bold">{selected.total_slots - selected.completed_slots}/{selected.total_slots}</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/30 border border-border">
                  <p className="text-[10px] uppercase text-muted-foreground">Proof</p>
                  <p className="font-bold capitalize">{((selected.proof_fields as ProofField[])?.length) || selected.proof_count} field{(((selected.proof_fields as ProofField[])?.length) || selected.proof_count) > 1 ? "s" : ""}</p>
                </div>
              </div>

              {selected.description && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}
              {selected.instructions && (
                <div className="p-3 rounded-lg bg-accent/30 border border-border">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Instructions</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.instructions}</p>
                </div>
              )}

              {mine.has(selected.id) ? (
                <Button disabled variant="secondary" className="w-full">Already submitted</Button>
              ) : selected.publisher_id === session?.user?.id ? (
                <Button disabled variant="secondary" className="w-full">This is your own task</Button>
              ) : !isActive ? (
                <Button className="w-full" variant="secondary" onClick={() => { setSelected(null); setActivationOpen(true); }}>
                  <Lock className="h-4 w-4" /> Submit Task (locked)
                </Button>
              ) : (
                <Button className="w-full bg-gradient-to-r from-primary to-primary/80" onClick={openSubmit}>
                  Submit & Earn ৳{Number(selected.reward).toFixed(2)}
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submission modal */}
      {selected && (
        <SubmissionDialog
          task={selected}
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          onSuccess={() => { setSubmitOpen(false); setSelected(null); load(); }}
        />
      )}
    </UserShell>
  );
}

function SubmissionDialog({ task, open, onOpenChange, onSuccess }: {
  task: any; open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void;
}) {
  const { session } = useAuth();
  const [values, setValues] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const proofFields: ProofField[] = (task.proof_fields as ProofField[])?.length
    ? task.proof_fields
    : [{ id: "legacy", type: task.proof_type ?? "image", label: task.proof_type === "text" ? "Your proof" : "Screenshot", required: true }];

  useEffect(() => { if (open) { setValues({}); setFiles({}); setNote(""); } }, [open]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    // Validate
    for (const f of proofFields) {
      if (!f.required) continue;
      if (f.type === "image") { if (!files[f.id]) { toast.error(`Please upload "৳{f.label}"`); return; } }
      else { if (!values[f.id] || String(values[f.id]).trim() === "") { toast.error(`Please fill "৳{f.label}"`); return; } }
      if (f.type === "link" && values[f.id]) {
        try { new URL(values[f.id]); } catch { toast.error(`"৳{f.label}" must be a valid URL`); return; }
      }
    }

    setBusy(true);
    try {
      const fieldsText = proofFields
        .filter(f => f.type !== "image" && values[f.id])
        .map(f => `৳{f.label}: ৳{values[f.id]}`).join("\n");
      const noteText = note.trim() ? `Note: ৳{note.trim()}` : "";
      const proofText = [fieldsText, noteText].filter(Boolean).join("\n\n");

      const { data: sub, error: subErr } = await supabase.from("task_submissions").insert({
        task_id: task.id, user_id: session.user.id, status: "pending",
        proof_text: proofText || null,
      }).select().single();

      if (subErr) throw subErr;

      for (const f of proofFields) {
        if (f.type !== "image" || !files[f.id]) continue;
        const file = files[f.id];
        if (file.size > 5 * 1024 * 1024) throw new Error("Each image must be under 5MB");
        if (!file.type.startsWith("image/")) throw new Error("Only image files allowed");
        const path = `৳{session.user.id}/৳{sub.id}/৳{Date.now()}-৳{file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("proofs").upload(path, file);
        if (upErr) throw upErr;
        const pub = supabase.storage.from("proofs").getPublicUrl(path).data.publicUrl;
        await supabase.from("task_submission_proofs").insert({ submission_id: sub.id, image_url: pub });
      }

      // Notify publisher
      if (task.publisher_id) {
        await supabase.from("notifications").insert({
          user_id: task.publisher_id,
          title: "New submission",
          message: `A user submitted proof for "৳{task.title}".`,
          type: "submission_new",
        });
      }

      toast.success("Submission sent! Awaiting publisher review.");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? "Submission failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit proof — {task.title}</DialogTitle>
          <DialogDescription>Complete all required fields below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {proofFields.map((f) => (
            <div key={f.id} className="space-y-2">
              <Label>{f.label}{f.required && <span className="text-destructive ml-1">*</span>}</Label>
              {f.type === "text" && (
                <Textarea rows={3} value={values[f.id] ?? ""}
                  onChange={(e) => setValues(v => ({ ...v, [f.id]: e.target.value }))} maxLength={1000} />
              )}
              {f.type === "link" && (
                <Input type="url" placeholder="https://…" value={values[f.id] ?? ""}
                  onChange={(e) => setValues(v => ({ ...v, [f.id]: e.target.value }))} maxLength={500} />
              )}
              {f.type === "username" && (
                <Input placeholder="@username or ID" value={values[f.id] ?? ""}
                  onChange={(e) => setValues(v => ({ ...v, [f.id]: e.target.value }))} maxLength={100} />
              )}
              {f.type === "image" && (
                <div className="border-2 border-dashed border-border rounded-lg p-3">
                  {files[f.id] ? (
                    <div className="relative">
                      <img src={URL.createObjectURL(files[f.id])} alt="" className="w-full max-h-40 object-cover rounded" />
                      <Button type="button" size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setFiles(p => { const n = { ...p }; delete n[f.id]; return n; })}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
                        setFiles(p => ({ ...p, [f.id]: file }));
                      }} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="space-y-2">
            <Label>Message to publisher <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000}
              placeholder="Add any notes, comments, or extra context for the publisher…" />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-to-r from-primary to-primary/80">
            {busy ? "Submitting…" : `Submit & earn ৳{Number(task.reward).toFixed(2)}`}
          </Button>
        </form>

      </DialogContent>
    </Dialog>
  );
}
