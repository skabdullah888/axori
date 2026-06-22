import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: boolean | undefined;
const subs = new Set<(v: boolean) => void>();

async function loadOnce() {
  if (cached !== undefined) return;
  const { data } = await supabase.from("settings").select("withdrawals_hidden").limit(1).maybeSingle();
  cached = !!((data as any)?.withdrawals_hidden);
  subs.forEach((cb) => cb(cached!));
}

export function useWithdrawalsHidden(): boolean {
  const [hidden, setHidden] = useState<boolean>(cached ?? false);
  useEffect(() => {
    subs.add(setHidden);
    loadOnce();
    return () => { subs.delete(setHidden); };
  }, []);
  return hidden;
}
