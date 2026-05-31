import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useIsAdmin = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  return isAdmin;
};
