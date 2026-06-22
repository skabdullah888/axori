import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LogOut, KeyRound, User as UserIcon, Bell as BellIcon, Shield, Camera, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { friendlyError } from "@/lib/friendly-error";
import { useWithdrawalsHidden } from "@/hooks/use-withdrawals-hidden";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — AxoraBD" }] }),
  staticData: { title: "Settings" },
  component: SettingsPage,
});

function SettingsPage() {
  const { session } = useAuth();
  const { profile, reload } = useProfile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const withdrawalsHidden = useWithdrawalsHidden();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const [notifyTasks, setNotifyTasks] = useState(true);
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [notifyAppeals, setNotifyAppeals] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  const [wMethod, setWMethod] = useState("");
  const [wAccount, setWAccount] = useState("");
  const [wPwd, setWPwd] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName((profile as any).full_name ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
    setNotifyTasks((profile as any).notify_tasks ?? true);
    setNotifyPayments((profile as any).notify_payments ?? true);
    setNotifyAppeals((profile as any).notify_appeals ?? true);
    setWMethod((profile as any).withdrawal_method ?? "");
    setWAccount((profile as any).withdrawal_account ?? "");
  }, [profile?.id]);

  const uploadAvatar = async (file: File) => {
    if (!session?.user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); toast.error(friendlyError(upErr)); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error } = await supabase.from("profiles")
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq("user_id", session.user.id);
    setUploading(false);
    if (error) { toast.error(friendlyError(error)); return; }
    setAvatarUrl(url);
    toast.success("Profile picture updated");
    reload();
  };

  const saveProfile = async () => {
    if (!session?.user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() } as any)
      .eq("user_id", session.user.id);
    setSavingProfile(false);
    if (error) toast.error(friendlyError(error)); else { toast.success("Profile updated"); reload(); }
  };

  const changePwd = async () => {
    if (newPwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPwd !== confirmPwd) { toast.error("Passwords do not match"); return; }
    if (!session?.user?.email) { toast.error("No email on account"); return; }
    setSavingPwd(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: session.user.email, password: currentPwd });
    if (signErr) { setSavingPwd(false); toast.error("Current password is incorrect"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) toast.error(friendlyError(error));
    else { toast.success("Password changed"); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }
  };

  const saveNotif = async () => {
    if (!session?.user) return;
    setSavingNotif(true);
    const { error } = await supabase.from("profiles")
      .update({ notify_tasks: notifyTasks, notify_payments: notifyPayments, notify_appeals: notifyAppeals, updated_at: new Date().toISOString() } as any)
      .eq("user_id", session.user.id);
    setSavingNotif(false);
    if (error) toast.error(friendlyError(error)); else { toast.success("Notification settings saved"); reload(); }
  };

  const savePayment = async () => {
    if (!session?.user?.email) return;
    if (!wMethod || !wAccount.trim()) { toast.error("Select method and enter account number"); return; }
    if (!wPwd) { toast.error("Enter your current password to confirm"); return; }
    setSavingPayment(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: session.user.email, password: wPwd });
    if (signErr) { setSavingPayment(false); toast.error("Password is incorrect"); return; }
    const { error } = await supabase.rpc("set_withdrawal_destination" as any, { p_method: wMethod, p_account: wAccount.trim() } as any);
    setSavingPayment(false);
    if (error) toast.error(friendlyError(error)); else { toast.success("Withdrawal info saved"); setWPwd(""); reload(); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth/login" });
  };

  return (
    <>
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserIcon className="h-4 w-4" /> Profile Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback>{(profile?.username?.[0] ?? "U").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Camera className="h-4 w-4" /> {uploading ? "Uploading…" : "Change photo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG/JPG up to 2MB</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile} className="bg-gradient-to-r from-primary to-primary/80">
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change Password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
            <Button onClick={changePwd} disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd} variant="outline">
              {savingPwd ? "Updating…" : "Update password"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BellIcon className="h-4 w-4" /> Notification Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Task notifications</p>
                <p className="text-xs text-muted-foreground">Updates about your task submissions</p>
              </div>
              <Switch checked={notifyTasks} onCheckedChange={setNotifyTasks} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Payment notifications</p>
                <p className="text-xs text-muted-foreground">Deposits, withdrawals and activations</p>
              </div>
              <Switch checked={notifyPayments} onCheckedChange={setNotifyPayments} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Appeal notifications</p>
                <p className="text-xs text-muted-foreground">Responses to your appeals</p>
              </div>
              <Switch checked={notifyAppeals} onCheckedChange={setNotifyAppeals} />
            </div>
            <Button onClick={saveNotif} disabled={savingNotif} variant="outline">
              {savingNotif ? "Saving…" : "Save preferences"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Payment Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Save your withdrawal info so you don't have to enter it every time.</p>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={wMethod} onValueChange={setWMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bKash">bKash</SelectItem>
                  <SelectItem value="Nagad">Nagad</SelectItem>
                  <SelectItem value="Rocket">Rocket</SelectItem>
                  <SelectItem value="Upay">Upay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account number</Label>
              <Input value={wAccount} onChange={(e) => setWAccount(e.target.value)} placeholder="e.g. 01XXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Confirm with current password</Label>
              <Input type="password" value={wPwd} onChange={(e) => setWPwd(e.target.value)} placeholder="Required to change withdrawal destination" />
            </div>
            <Button onClick={savePayment} disabled={savingPayment} className="bg-gradient-to-r from-primary to-primary/80">
              {savingPayment ? "Saving…" : "Save withdrawal info"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><Shield className="h-4 w-4" /> Account</CardTitle></CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={logout}><LogOut className="h-4 w-4" /> Logout from this device</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
