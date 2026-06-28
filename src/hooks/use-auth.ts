import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Verify the user still exists on the server (admin may have deleted them)
        const { data: userData, error } = await supabase.auth.getUser();
        // Only sign out for explicit auth errors (invalid/expired session, user deleted),
        // NOT transient network failures.
        const status = (error as any)?.status;
        const isAuthError = error && (status === 401 || status === 403 || !userData?.user);
        if (isAuthError) {
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
    }).catch(() => {
      // Network failure — keep current session, don't force logout
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, isAuthed: !!session };
}
