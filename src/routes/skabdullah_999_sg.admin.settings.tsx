import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings2, Wallet, Plus, Trash2, CreditCard } from "lucide-react";

export const Route = createFileRoute("/skabdullah_999_sg/admin/settings")({
  head: () => ({ meta: [{ title: "Admin Settings — Axora" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [row, setRow] = useState<any>(null);
  const [form, setForm] = useState({
    activation_amount: 0, withdrawal_fee: 0, minimum_withdrawal: 0, publisher_task_tax: 0, referral_bonus: 0, minimum_referrals_for_withdrawal: 0,
  });
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState<any[]>([]);
  const [newMethod, setNewMethod] = useState({ name: "", receiver_number: "", instructions: "" });
  const [addingMethod, setAddingMethod] = useState(false);

  const loadSettings = async () => {
    const { data } = await supabase.from("settings").select("*").limit(1).maybeSingle();
    if (data) {
      setRow(data);
      setForm({
        activation_amount: Number(data.activation_amount ?? data.activation_fee ?? 0),
        withdrawal_fee: Number(data.withdrawal_fee),
        minimum_withdrawal: Number(data.minimum_withdrawal),
        publisher_task_tax: Number(data.publisher_task_tax ?? 0),
        referral_bonus: Number(data.referral_bonus ?? 0),
        minimum_referrals_for_withdrawal: Number((data as any).minimum_referrals_for_withdrawal ?? 0),
      });
    }
  };

  const loadMethods = async () => {
    const { data } = await supabase.from("payment_methods").select("*").order("created_at", { ascending: true });
    setMethods(data ?? []);
  };

  useEffect(() => { loadSettings(); loadMethods(); }, []);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    // keep activation_fee and activation_amount in sync for backward compatibility
    const payload = {
      activation_amount: form.activation_amount,
      activation_fee: form.activation_amount,
      withdrawal_fee: form.withdrawal_fee,
      minimum_withdrawal: form.minimum_withdrawal,
      publisher_task_tax: form.publisher_task_tax,
      referral_bonus: form.referral_bonus,
      minimum_referrals_for_withdrawal: form.minimum_referrals_for_withdrawal,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("settings").update(payload).eq("id", row.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  };

  const addMethod = async () => {
    if (!newMethod.name.trim() || !newMethod.receiver_number.trim()) {
      toast.error("Name and receiver number are required"); return;
    }
    setAddingMethod(true);
    const { error } = await supabase.from("payment_methods").insert({
      name: newMethod.name.trim(),
      receiver_number: newMethod.receiver_number.trim(),
      instructions: newMethod.instructions.trim() || null,
      active: true,
    });
    setAddingMethod(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment method added");
    setNewMethod({ name: "", receiver_number: "", instructions: "" });
    loadMethods();
  };

  const updateMethod = async (id: string, patch: any) => {
    const { error } = await supabase.from("payment_methods").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); loadMethods(); }
  };

  const deleteMethod = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); loadMethods(); }
  };

  return (
    <AdminShell title="Settings">
      <div className="grid gap-6 max-w-5xl">
        {/* Fees & limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Settings2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Fees & limits</CardTitle>
                <CardDescription>Platform-wide amounts and percentages applied across the app.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Activation amount (৳)"
                hint="Amount each user must pay to activate their account."
                value={form.activation_amount}
                onChange={(v) => setForm(f => ({ ...f, activation_amount: v }))}
              />
              <Field
                label="Minimum withdrawal (৳)"
                hint="Smallest amount a user can request to withdraw."
                value={form.minimum_withdrawal}
                onChange={(v) => setForm(f => ({ ...f, minimum_withdrawal: v }))}
              />
              <Field
                label="Withdrawal fee (%)"
                hint="Percentage deducted from each withdrawal request."
                value={form.withdrawal_fee}
                onChange={(v) => setForm(f => ({ ...f, withdrawal_fee: v }))}
              />
              <Field
                label="Publisher task tax (%)"
                hint="Deducted from publisher's balance for each new task."
                value={form.publisher_task_tax}
                onChange={(v) => setForm(f => ({ ...f, publisher_task_tax: v }))}
              />
              <Field
                label="Referral bonus (৳)"
                hint="Credited to the referrer when their referred user activates."
                value={form.referral_bonus}
                onChange={(v) => setForm(f => ({ ...f, referral_bonus: v }))}
              />
              <Field
                label="Minimum referrals to withdraw"
                hint="User must have referred at least this many people before they can request a withdrawal. Set to 0 to disable."
                value={form.minimum_referrals_for_withdrawal}
                onChange={(v) => setForm(f => ({ ...f, minimum_referrals_for_withdrawal: v }))}
              />
            </div>
            <Separator className="my-5" />
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Payment methods</CardTitle>
                <CardDescription>Receiver numbers users send activation & deposit funds to.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Add new */}
            <div className="rounded-lg border border-dashed border-border p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                <Plus className="h-4 w-4 text-primary" /> Add new method
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input placeholder="bKash / Nagad / Rocket"
                    value={newMethod.name}
                    onChange={(e) => setNewMethod(m => ({ ...m, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Receiver number</Label>
                  <Input placeholder="01XXXXXXXXX"
                    value={newMethod.receiver_number}
                    onChange={(e) => setNewMethod(m => ({ ...m, receiver_number: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type (optional)</Label>
                  <Input placeholder="Send Money / Personal"
                    value={newMethod.instructions}
                    onChange={(e) => setNewMethod(m => ({ ...m, instructions: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={addMethod} disabled={addingMethod}>
                  <Plus className="h-4 w-4" /> {addingMethod ? "Adding…" : "Add method"}
                </Button>
              </div>
            </div>

            {/* List */}
            {methods.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10 border border-dashed border-border rounded-lg">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No payment methods yet. Add one above.
              </div>
            ) : (
              <div className="space-y-3">
                {methods.map((m) => (
                  <MethodRow key={m.id} method={m} onUpdate={updateMethod} onDelete={deleteMethod} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function Field({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input type="number" step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MethodRow({ method, onUpdate, onDelete }: {
  method: any;
  onUpdate: (id: string, patch: any) => void;
  onDelete: (id: string) => void;
}) {
  const [edit, setEdit] = useState({
    name: method.name,
    receiver_number: method.receiver_number,
    instructions: method.instructions ?? "",
  });
  const dirty = edit.name !== method.name || edit.receiver_number !== method.receiver_number || (edit.instructions ?? "") !== (method.instructions ?? "");

  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <span className="font-semibold">{method.name}</span>
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${method.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
            {method.active ? "Active" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch checked={method.active} onCheckedChange={(v) => onUpdate(method.id, { active: v })} />
          </div>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(method.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input value={edit.name} onChange={(e) => setEdit(s => ({ ...s, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Receiver number</Label>
          <Input value={edit.receiver_number} onChange={(e) => setEdit(s => ({ ...s, receiver_number: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Instructions</Label>
          <Textarea rows={1} value={edit.instructions} onChange={(e) => setEdit(s => ({ ...s, instructions: e.target.value }))} />
        </div>
      </div>
      {dirty && (
        <div className="flex justify-end mt-3 gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEdit({ name: method.name, receiver_number: method.receiver_number, instructions: method.instructions ?? "" })}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onUpdate(method.id, edit)}>Save</Button>
        </div>
      )}
    </div>
  );
}
