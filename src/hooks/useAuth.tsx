import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (
        event === "PASSWORD_RECOVERY" &&
        window.location.pathname !== "/reset-password"
      ) {
        window.location.replace("/reset-password" + window.location.hash);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("lulutales_profile_id");
    localStorage.removeItem("lulutales_child_name");
    localStorage.removeItem("lulutales_child_age");
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("lulutales_profile_checked_"))
      .forEach((k) => sessionStorage.removeItem(k));
  };

  return <Ctx.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
