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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { friendlyError } from "@/lib/friendly-error";
import { toast } from "sonner";
import { Settings2, Wallet, Plus, Trash2, CreditCard, Palette, Check, Megaphone } from "lucide-react";
import { SITE_THEME_LIST, type SiteThemeId } from "@/lib/site-themes";
import { AD_PLACEMENTS, emptyAdsConfig, parseAdsConfig, type AdsConfig, type AdPlacement } from "@/lib/ads";

export const Route = createFileRoute("/skabdullah_999_sg/admin/settings")({
  head: () => ({ meta: [{ title: "Admin Settings — AxoraBD" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [row, setRow] = useState<any>(null);
  const [form, setForm] = useState({
    activation_amount: 0, withdrawal_fee: 0, minimum_withdrawal: 0, publisher_task_tax: 0, referral_bonus: 0, minimum_referrals_for_withdrawal: 0, minimum_tasks_for_withdrawal: 0, withdrawals_enabled: true, minimum_task_publish_amount: 0, minimum_task_total_amount: 0,
  });
  const [siteTheme, setSiteTheme] = useState<SiteThemeId>("default");
  const [savingTheme, setSavingTheme] = useState(false);
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState<any[]>([]);
  const [newMethod, setNewMethod] = useState({ name: "", receiver_number: "", instructions: "" });
  const [addingMethod, setAddingMethod] = useState(false);
  const [adsCfg, setAdsCfg] = useState<AdsConfig>(emptyAdsConfig());
  const [savingAds, setSavingAds] = useState(false);

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
        minimum_tasks_for_withdrawal: Number((data as any).minimum_tasks_for_withdrawal ?? 0),
        withdrawals_enabled: (data as any).withdrawals_enabled ?? true,
        minimum_task_publish_amount: Number((data as any).minimum_task_publish_amount ?? 0),
        minimum_task_total_amount: Number((data as any).minimum_task_total_amount ?? 0),
      });
      setSiteTheme((((data as any).site_theme as SiteThemeId | undefined) ?? "default") as SiteThemeId);
      setAdsCfg(parseAdsConfig(data));
    }
  };

  const saveAds = async () => {
    if (!row) return;
    setSavingAds(true);
    const { error } = await supabase.from("settings").update({
      ads_enabled: adsCfg.enabled,
      ads_client: adsCfg.client.trim(),
      ads_slots: adsCfg.slots,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    setSavingAds(false);
    if (error) toast.error(friendlyError(error)); else toast.success("Ad settings saved");
  };

  const setSlot = (id: AdPlacement, patch: Partial<{ enabled: boolean; slot: string }>) => {
    setAdsCfg((c) => ({
      ...c,
      slots: { ...c.slots, [id]: { enabled: false, slot: "", ...(c.slots[id] ?? {}), ...patch } },
    }));
  };

  const saveTheme = async (id: SiteThemeId) => {
    if (!row) return;
    const prev = siteTheme;
    setSiteTheme(id);
    setSavingTheme(true);
    const { error } = await supabase.from("settings").update({ site_theme: id, updated_at: new Date().toISOString() }).eq("id", row.id);
    setSavingTheme(false);
    if (error) { setSiteTheme(prev); toast.error(friendlyError(error)); }
    else toast.success("Theme updated");
  };

  const loadMethods = async () => {
    const { data } = await supabase.from("payment_methods").select("*").order("created_at", { ascending: true });
    setMethods(data ?? []);
  };

  useEffect(() => { loadSettings(); loadMethods(); }, []);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const payload = {
      activation_amount: form.activation_amount,
      activation_fee: form.activation_amount,
      withdrawal_fee: form.withdrawal_fee,
      minimum_withdrawal: form.minimum_withdrawal,
      publisher_task_tax: form.publisher_task_tax,
      referral_bonus: form.referral_bonus,
      minimum_referrals_for_withdrawal: form.minimum_referrals_for_withdrawal,
      minimum_tasks_for_withdrawal: form.minimum_tasks_for_withdrawal,
      withdrawals_enabled: form.withdrawals_enabled,
      minimum_task_publish_amount: form.minimum_task_publish_amount,
      minimum_task_total_amount: form.minimum_task_total_amount,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("settings").update(payload).eq("id", row.id);
    setSaving(false);
    if (error) toast.error(friendlyError(error)); else toast.success("Settings saved");
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
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success("Payment method added");
    setNewMethod({ name: "", receiver_number: "", instructions: "" });
    loadMethods();
  };

  const updateMethod = async (id: string, patch: any) => {
    const { error } = await supabase.from("payment_methods").update(patch).eq("id", id);
    if (error) toast.error(friendlyError(error)); else { toast.success("Updated"); loadMethods(); }
  };

  const deleteMethod = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) toast.error(friendlyError(error)); else { toast.success("Deleted"); loadMethods(); }
  };

  return (
    <AdminShell title="Settings">
      <Tabs defaultValue="fees" className="max-w-5xl">
        <TabsList className="mb-6">
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Fees & Limits
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Payment Methods
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" /> Site Theme
          </TabsTrigger>
          <TabsTrigger value="ads" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Ads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fees">
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
                <Field
                  label="Minimum tasks published to withdraw"
                  hint="User must have published at least this many tasks before they can request a withdrawal. Set to 0 to disable."
                  value={form.minimum_tasks_for_withdrawal}
                  onChange={(v) => setForm(f => ({ ...f, minimum_tasks_for_withdrawal: v }))}
                />
                <Field
                  label="Minimum balance to publish task (৳)"
                  hint="User must have at least this much balance to create a new task. Set to 0 to disable."
                  value={form.minimum_task_publish_amount}
                  onChange={(v) => setForm(f => ({ ...f, minimum_task_publish_amount: v }))}
                />
                <Field
                  label="Minimum task total amount — reward × slots (৳)"
                  hint="A new task's total value (reward × slots, before tax) must be at least this much. Set to 0 to disable."
                  value={form.minimum_task_total_amount}
                  onChange={(v) => setForm(f => ({ ...f, minimum_task_total_amount: v }))}
                />
              </div>
              <Separator className="my-5" />
              <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-4">
                <div>
                  <Label className="text-sm font-medium">Allow withdrawals</Label>
                  <p className="text-xs text-muted-foreground mt-1">When off, users cannot submit new withdrawal requests.</p>
                </div>
                <Switch
                  checked={form.withdrawals_enabled}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, withdrawals_enabled: v }))}
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
        </TabsContent>

        <TabsContent value="payments">
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
        </TabsContent>

        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Palette className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle>Site theme</CardTitle>
                  <CardDescription>
                    Choose how the public landing page and user app look and what story they tell. The site name (AxoraBD), all features, tasks, earnings and workflows stay exactly the same — only colors, hero copy, purpose description and SEO meta change. Admin panel is not affected.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {SITE_THEME_LIST.map((t) => {
                  const active = siteTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={savingTheme}
                      onClick={() => saveTheme(t.id as SiteThemeId)}
                      className={`relative text-left rounded-xl border p-4 transition hover:shadow-md disabled:opacity-60 ${active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border bg-card/40"}`}
                    >
                      {active && (
                        <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        {t.swatch.map((c, i) => (
                          <span key={i} className="h-6 w-6 rounded-full border border-border" style={{ background: c }} />
                        ))}
                      </div>
                      <div className="font-semibold">{t.label}</div>
                      <p className="text-xs text-muted-foreground mt-1">{t.tagline}</p>
                      <Separator className="my-3" />
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Hero</div>
                      <div className="text-sm font-medium leading-snug">{t.hero.titlePrefix} <span className="text-primary">{t.hero.titleHighlight}</span></div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.hero.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
