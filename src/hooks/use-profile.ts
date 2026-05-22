import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Profile = {
  id: string;
  user_id: string;
  username: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  balance: number;
  trust_score: number;
  status: string;
  is_publisher: boolean;
  referral_code: string | null;
  referred_by: string | null;
  activated_at: string | null;
  last_activation_request_at: string | null;
  created_at: string;
};

export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activationFee, setActivationFee] = useState<number | null>(null);

  const reload = async () => {
    if (!session?.user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  };

  const reloadSettings = async () => {
    const { data } = await supabase.from("settings").select("activation_fee,activation_amount").limit(1).maybeSingle();
    const fee = Number((data as any)?.activation_fee ?? (data as any)?.activation_amount ?? 0);
    setActivationFee(fee);
  };

  useEffect(() => {
    reload();
    reloadSettings();
    if (!session?.user) return;
    const ch = supabase.channel(`profile-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${session.user.id}` }, (payload) => {
        if (payload.eventType === "DELETE") {
          supabase.auth.signOut().then(() => {
            if (typeof window !== "undefined") window.location.href = "/auth/login";
          });
          return;
        }
        reload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, reloadSettings)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const feeIsZero = activationFee !== null && activationFee <= 0;
  const isActive = profile?.status === "active" || feeIsZero;

  return { profile, loading, reload, isActive, activationFeeZero: feeIsZero };
}
