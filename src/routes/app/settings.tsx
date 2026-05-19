import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, KeyRound, User as UserIcon, Bell as BellIcon, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { UserShell } from "@/components/user-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Earn Hub" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session } = useAuth();
  const { profile, reload } = useProfile();
  const navigate = useNavigate();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [newPwd, setNewPwd] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);

  const saveProfile = async () => {
    if (!session?.user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles")
      .update({ username, phone, updated_at: new Date().toISOString() })
      .eq("user_id", session.user.id);
    setSavingProfile(false);
    if (error) toast.error(error.message); else { toast.success("Profile updated"); reload(); }
  };

  const changePwd = async () => {
    if (newPwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) toast.error(error.message); else { toast.success("Password changed"); setNewPwd(""); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth/login" });
  };

  return (
    <UserShell title="Settings">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserIcon className="h-4 w-4" /> Profile information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile} className="bg-gradient-to-r from-primary to-primary/80">
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <Button onClick={changePwd} disabled={savingPwd || !newPwd} variant="outline">
              {savingPwd ? "Updating…" : "Update password"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BellIcon className="h-4 w-4" /> Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Email notifications</p>
                <p className="text-xs text-muted-foreground">Receive updates by email</p>
              </div>
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">In-app notifications</p>
                <p className="text-xs text-muted-foreground">Show alerts inside the app</p>
              </div>
              <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><Shield className="h-4 w-4" /> Account</CardTitle></CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={logout}><LogOut className="h-4 w-4" /> Logout from this device</Button>
          </CardContent>
        </Card>
      </div>
    </UserShell>
  );
}
