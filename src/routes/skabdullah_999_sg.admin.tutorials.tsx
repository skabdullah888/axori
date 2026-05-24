import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";
import { Plus, Trash2, Video } from "lucide-react";

export const Route = createFileRoute("/skabdullah_999_sg/admin/tutorials")({
  head: () => ({ meta: [{ title: "Tutorial Videos — Admin" }] }),
  component: TutorialsPage,
});

type Row = { id: string; section_key: string; title: string; video_url: string };

const SUGGESTED = [
  "tasks", "submissions", "appeals", "wallet", "deposit",
  "withdraw", "publish", "referrals", "profile", "settings", "dashboard",
];

function TutorialsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState({ section_key: "", title: "", video_url: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("section_videos").select("*").order("section_key", { ascending: true });
    if (error) toast.error(friendlyError(error));
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (r: Row) => {
    setSavingId(r.id);
    const { error } = await supabase.from("section_videos")
      .update({ title: r.title, video_url: r.video_url }).eq("id", r.id);
    setSavingId(null);
    if (error) return toast.error(friendlyError(error));
    toast.success("Saved");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this tutorial entry?")) return;
    const { error } = await supabase.from("section_videos").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error));
    toast.success("Deleted");
    load();
  };

  const add = async () => {
    if (!newRow.section_key.trim()) return toast.error("Section key required");
    const { error } = await supabase.from("section_videos").insert({
      section_key: newRow.section_key.trim().toLowerCase(),
      title: newRow.title.trim(),
      video_url: newRow.video_url.trim(),
    });
    if (error) return toast.error(friendlyError(error));
    setNewRow({ section_key: "", title: "", video_url: "" });
    toast.success("Added");
    load();
  };

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <AdminShell title="Tutorial Videos">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-primary" /> Add new tutorial</CardTitle>
            <CardDescription>
              Set a tutorial video for a section. Common section keys: {SUGGESTED.join(", ")}.
              Supported URLs: YouTube, Vimeo, or direct .mp4/.webm links.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
            <div>
              <Label>Section key</Label>
              <Input value={newRow.section_key}
                onChange={(e) => setNewRow({ ...newRow, section_key: e.target.value })}
                placeholder="e.g. publish" />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={newRow.title}
                onChange={(e) => setNewRow({ ...newRow, title: e.target.value })}
                placeholder="How to publish a task" />
            </div>
            <div>
              <Label>Video URL</Label>
              <Input value={newRow.video_url}
                onChange={(e) => setNewRow({ ...newRow, video_url: e.target.value })}
                placeholder="https://youtu.be/..." />
            </div>
            <Button onClick={add} className="gap-2"><Plus className="h-4 w-4" /> Add</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All tutorial videos</CardTitle>
            <CardDescription>Leave a URL empty to hide the button in that section.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tutorials yet.</p>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <div key={r.id} className="grid gap-3 md:grid-cols-[160px_1fr_2fr_auto] md:items-end border border-border rounded-lg p-3">
                    <div>
                      <Label className="text-xs">Section</Label>
                      <div className="font-mono text-sm mt-2 px-2 py-1 bg-muted rounded">{r.section_key}</div>
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input value={r.title} onChange={(e) => update(r.id, { title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Video URL</Label>
                      <Input value={r.video_url} onChange={(e) => update(r.id, { video_url: e.target.value })}
                        placeholder="https://youtu.be/..." />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => save(r)} disabled={savingId === r.id}>
                        {savingId === r.id ? "Saving…" : "Save"}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
