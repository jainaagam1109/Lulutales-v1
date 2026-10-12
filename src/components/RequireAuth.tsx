import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { loadActiveProfileForUser } from "@/lib/activeProfile";

type Props = { children: ReactNode };

// Module-level flag: validate the stored profile id at most once per app load.
let profileValidatedForUserId: string | null = null;

/**
 * Gates routes:
 * - No session -> /auth
 * - Signed in: sync localStorage cache from child_profiles.status='active'.
 *   No active row = explorer (no-active-child) — allow browsing top pages.
 */
export const RequireAuth = ({ children }: Props) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setRedirectTo(null);
      setChecking(false);
      return;
    }
    if (!session) {
      // Bring the parent back to the page they were trying to open once they sign in.
      const here = `${location.pathname}${location.search}`;
      setRedirectTo(here && here !== "/" ? `/auth?next=${encodeURIComponent(here)}` : "/auth");
      setChecking(false);
      return;
    }
    const bypass = ["/onboarding", "/select-profile", "/add-child", "/profiles"].includes(
      location.pathname
    );
    if (bypass) {
      setRedirectTo(null);
      setChecking(false);
      return;
    }
    if (profileValidatedForUserId === session.user.id) {
      setRedirectTo(null);
      setChecking(false);
      return;
    }
    (async () => {
      await loadActiveProfileForUser(session.user.id);
      profileValidatedForUserId = session.user.id;
      setRedirectTo(null);
      setChecking(false);
    })();
  }, [session, loading, location.pathname, location.search]);

  if (loading || checking) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>
    );
  }
  if (redirectTo && redirectTo.split("?")[0] !== location.pathname) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  return <>{children}</>;
};

