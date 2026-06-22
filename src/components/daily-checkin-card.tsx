import { useEffect, useState } from "react";
import { Flame, Gift, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { friendlyError } from "@/lib/friendly-error";

type Settings = {
  daily_checkin_enabled: boolean;
  daily_checkin_amount: number;
  daily_checkin_streak_days: number;
  daily_checkin_streak_bonus: number;
};

export function DailyCheckinCard() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [streak, setStreak] = useState(0);
  const [lastAt, setLastAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (!session?.user) return;
    const [s, p] = await Promise.all([
      supabase.from("settings").select("daily_checkin_enabled,daily_checkin_amount,daily_checkin_streak_days,daily_checkin_streak_bonus").limit(1).maybeSingle(),
      supabase.from("profiles").select("checkin_streak,last_checkin_at").eq("user_id", session.user.id).maybeSingle(),
    ]);
    setSettings((s.data as any) ?? null);
    setStreak(((p.data as any)?.checkin_streak as number) ?? 0);
    setLastAt(((p.data as any)?.last_checkin_at as string) ?? null);
    setLoaded(true);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [session?.user?.id]);

  if (!loaded || !settings || !settings.daily_checkin_enabled || Number(settings.daily_checkin_amount) <= 0) {
    return null;
  }

  const todayUTC = new Date().toISOString().slice(0, 10);
  const lastDate = lastAt ? new Date(lastAt).toISOString().slice(0, 10) : null;
  const claimedToday = lastDate === todayUTC;

  const targetDays = Math.max(1, Number(settings.daily_checkin_streak_days) || 7);
  const bonus = Number(settings.daily_checkin_streak_bonus) || 0;
  const amount = Number(settings.daily_checkin_amount) || 0;
  const progress = Math.min(streak, targetDays);

  const claim = async () => {
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("claim_daily_checkin");
      if (error) throw error;
      const credited = Number((data as any)?.credited ?? amount);
      const bonusGot = Number((data as any)?.bonus ?? 0);
      if (bonusGot > 0) {
        toast.success(`🎉 Streak bonus! You got ৳${credited}`);
      } else {
        toast.success(`✓ Claimed ৳${credited}`);
      }
      await load();
    } catch (e: any) {
      toast.error(friendlyError(e, "Could not claim"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent relative">
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Daily check-in</h3>
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full">
                    <Flame className="h-3 w-3" /> {streak} day{streak !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Claim ৳{amount} every day
                {bonus > 0 && <> · ৳{bonus} bonus at {targetDays} days 🔥</>}
              </p>
            </div>
          </div>
          <Button
            onClick={claim}
            disabled={busy || claimedToday}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white shadow-md"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : claimedToday ? "✓ Claimed today" : <><Sparkles className="h-4 w-4 mr-1" /> Claim ৳{amount}</>}
          </Button>
        </div>

        {bonus > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Streak progress</span>
              <span className="font-semibold">{progress}/{targetDays}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: targetDays }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    i < progress
                      ? "bg-gradient-to-r from-amber-400 to-orange-500"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
