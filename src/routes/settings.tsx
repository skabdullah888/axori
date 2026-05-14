import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const [row, setRow] = useState<any>(null);
  const [form, setForm] = useState({ activation_fee: 0, withdrawal_fee: 0, minimum_withdrawal: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) { setRow(data); setForm({
        activation_fee: Number(data.activation_fee), withdrawal_fee: Number(data.withdrawal_fee),
        minimum_withdrawal: Number(data.minimum_withdrawal),
      }); }
    });
  }, []);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase.from("settings").update({ ...form, updated_at: new Date().toISOString() }).eq("id", row.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  };

  return (
    <AdminShell title="Settings">
      <Card className="max-w-xl">
        <CardHeader><CardTitle>Platform fees</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Activation fee ($)</Label>
            <Input type="number" step="0.01" value={form.activation_fee}
              onChange={(e) => setForm(f => ({ ...f, activation_fee: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Withdrawal fee ($)</Label>
            <Input type="number" step="0.01" value={form.withdrawal_fee}
              onChange={(e) => setForm(f => ({ ...f, withdrawal_fee: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Minimum withdrawal ($)</Label>
            <Input type="number" step="0.01" value={form.minimum_withdrawal}
              onChange={(e) => setForm(f => ({ ...f, minimum_withdrawal: Number(e.target.value) }))} />
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
