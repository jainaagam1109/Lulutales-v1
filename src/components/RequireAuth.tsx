import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Props = { children: ReactNode };

// Module-level flag: validate the stored profile id at most once per app load.
let profileValidatedForUserId: string | null = null;

/**
 * Gates routes:
 * - No session -> /auth
 * - Signed in but no kid profiles -> /onboarding
 * - Signed in with kids -> ensure localStorage profile id belongs to this user;
 *   if missing/invalid, auto-pick the first profile and sync name/age.
 */
export const RequireAuth = ({ children }: Props) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    // If this is a password recovery callback, don't redirect anywhere —
    // AuthProvider will route the user to /reset-password.
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setRedirectTo(null);
      setChecking(false);
      return;
    }
    if (!session) {
      setRedirectTo("/auth");
      setChecking(false);
      return;
    }
    const bypass = ["/onboarding", "/select-profile", "/add-child"].includes(location.pathname);
    if (bypass) {
      setRedirectTo(null);
      setChecking(false);
      return;
    }
    // Already validated this session.user in this app load — trust localStorage.
    if (profileValidatedForUserId === session.user.id) {
      setRedirectTo(null);
      setChecking(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("child_profiles")
        .select("id, name, age")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      if (error) {
        setRedirectTo("/auth");
        setChecking(false);
        return;
      }
      const kids = data ?? [];
      if (kids.length === 0) {
        localStorage.removeItem("lulutales_profile_id");
        localStorage.removeItem("lulutales_child_name");
        localStorage.removeItem("lulutales_child_age");
        setRedirectTo("/onboarding");
        setChecking(false);
        return;
      }
      const activeId = localStorage.getItem("lulutales_profile_id");
      const match = activeId ? kids.find((k) => k.id === activeId) : null;
      if (!match) {
        const first = kids[0];
        localStorage.setItem("lulutales_profile_id", first.id);
        localStorage.setItem("lulutales_child_name", first.name);
        localStorage.setItem("lulutales_child_age", String(first.age));
      }
      profileValidatedForUserId = session.user.id;
      setRedirectTo(null);
      setChecking(false);
    })();
  }, [session, loading, location.pathname]);

  if (loading || checking) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>
    );
  }
  if (redirectTo && redirectTo !== location.pathname) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  return <>{children}</>;
};
