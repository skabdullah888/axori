import { useEffect, useMemo, useState } from "react";
import { Paginator } from "@/components/paginator";
const PAGE_SIZE = 25;
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Ban, ShieldCheck, Pencil, Trash2 } from "lucide-react";
import { fmtDate, StatusPill, EmptyState, fmtMoney } from "@/lib/admin-utils";
import { deleteUserAccount } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/skabdullah_999_sg/admin/users")({
  head: () => ({ meta: [{ title: "Admin Users — Axora" }] }),
  component: UsersPage,
});

type StatusFilter = "all" | "active" | "inactive" | "banned";

function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [edit, setEdit] = useState<any | null>(null);
  const [deleteRow, setDeleteRow] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const callDelete = useServerFn(deleteUserAccount);
  const [form, setForm] = useState({ balance: 0, trust_score: 100 });

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("users-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setStatus = async (id: string, status: "active" | "banned" | "inactive") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else toast.success(`User ${status}`);
  };

  const openEdit = (r: any) => {
    setEdit(r);
    setForm({ balance: Number(r.balance ?? 0), trust_score: Number(r.trust_score ?? 100) });
  };

  const saveEdit = async () => {
    if (!edit) return;
    const { error } = await supabase.from("profiles")
      .update({ balance: form.balance, trust_score: form.trust_score })
      .eq("id", edit.id);
    if (error) toast.error(error.message);
    else { toast.success("User updated"); setEdit(null); }
  };

  const filtered = rows.filter(r => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.username?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q);
  });
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, filter]);
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);


  return (
    <AdminShell title="Users Management">
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Input
          placeholder="Search by username or user ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          {(["all", "active", "inactive", "banned"] as StatusFilter[]).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <Card><CardContent className="p-0">
        {filtered.length === 0 ? <EmptyState message="No users." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Username</th>
                  <th className="text-left px-4 py-3">User ID</th>
                  <th className="text-left px-4 py-3">Balance</th>
                  <th className="text-left px-4 py-3">Trust</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">{r.username}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3">{fmtMoney(r.balance)}</td>
                    <td className="px-4 py-3">{r.trust_score}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4 mr-1" />Edit
                        </Button>
                        {r.status === "banned" ? (
                          <Button size="sm" onClick={() => setStatus(r.id, "active")}>
                            <ShieldCheck className="h-4 w-4 mr-1" />Unban
                          </Button>
                        ) : (
                          <Button size="sm" variant="destructive" onClick={() => setStatus(r.id, "banned")}>
                            <Ban className="h-4 w-4 mr-1" />Ban
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => setDeleteRow(r)}>
                          <Trash2 className="h-4 w-4 mr-1" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>
      <Paginator page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />


      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit user — {edit?.username}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Balance (৳)</Label>
              <Input type="number" step="0.01" value={form.balance}
                onChange={(e) => setForm(f => ({ ...f, balance: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Trust score</Label>
              <Input type="number" value={form.trust_score}
                onChange={(e) => setForm(f => ({ ...f, trust_score: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Status</Label>
              <div className="flex gap-2 mt-1">
                {(["active", "inactive", "banned"] as const).map(s => (
                  <Button key={s} size="sm"
                    variant={edit?.status === s ? "default" : "secondary"}
                    onClick={async () => { await setStatus(edit.id, s); setEdit({ ...edit, status: s }); }}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && !deleting && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user @{deleteRow?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user and ALL of their data — profile, balance ({fmtMoney(deleteRow?.balance)}),
              payments, submissions, published tasks, appeals, referrals and notifications.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteRow?.user_id) { toast.error("Missing user id"); return; }
                setDeleting(true);
                try {
                  await callDelete({ data: { userId: deleteRow.user_id } });
                  toast.success("User deleted");
                  setDeleteRow(null);
                  load();
                } catch (err: any) {
                  toast.error(err?.message ?? "Failed to delete user");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
