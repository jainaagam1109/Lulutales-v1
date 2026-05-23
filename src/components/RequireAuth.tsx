import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/myproject/client";

type Props = { children: ReactNode };

/**
 * Gates routes:
 * - No session -> /auth
 * - Signed in but no kid profiles -> /onboarding
 * - Signed in with kids but no active profile selected -> /select-profile (if 2+) or auto-pick (if 1)
 */
export const RequireAuth = ({ children }: Props) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setRedirectTo("/auth");
      setChecking(false);
      return;
    }
    // Allow these routes to bypass kid-profile check
    const bypass = ["/onboarding", "/select-profile"].includes(location.pathname);
    if (bypass) {
      setRedirectTo(null);
      setChecking(false);
      return;
    }
    const activeId = localStorage.getItem("lulutales_profile_id");
    const cacheKey = `lulutales_profile_checked_${session.user.id}`;
    if (sessionStorage.getItem(cacheKey)) {
      setRedirectTo(null);
      setChecking(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("child_profiles")
        .select("id, name")
        .eq("user_id", session.user.id);
      if (error) {
        setRedirectTo("/auth");
        setChecking(false);
        return;
      }
      const kids = data ?? [];
      if (kids.length === 0) {
        setRedirectTo("/onboarding");
      } else if (!activeId || !kids.find((k) => k.id === activeId)) {
        if (kids.length === 1) {
          localStorage.setItem("lulutales_profile_id", kids[0].id);
          localStorage.setItem("lulutales_child_name", kids[0].name);
          setRedirectTo(null);
        } else {
          setRedirectTo("/select-profile");
        }
      } else {
        setRedirectTo(null);
      }
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
