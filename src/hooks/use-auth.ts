import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Verify the user still exists on the server (admin may have deleted them)
        const { error } = await supabase.auth.getUser();
        if (error) {
          await supabase.auth.signOut();
          setSession(null);
          setLoading(false);
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
            window.location.href = "/auth/login";
          }
          return;
        }
      }
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, isAuthed: !!session };
}
