import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let claimedFor: string | null = null;

    /** Attach the signed-in account to its employee record (matched on work email). */
    const claim = (s: Session | null) => {
      if (!s?.user?.id || claimedFor === s.user.id) return;
      claimedFor = s.user.id;
      setTimeout(() => {
        supabase.rpc("claim_employee_link").then(({ error }) => {
          if (error) console.warn("Employee link-up skipped:", error.message);
        });
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      claim(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      claim(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, loading, signOut };
}
