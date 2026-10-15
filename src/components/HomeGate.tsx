import { ReactNode, useEffect } from "react";
import { removePrerender } from "@/lib/prerender";
import { useAuth } from "@/hooks/useAuth";

/**
 * "/" shows the welcome page to visitors and the app Home to signed-in families.
 * Password-recovery links (hash type=recovery) always go through the app route.
 */
export const HomeGate = ({ home, welcome }: { home: ReactNode; welcome: ReactNode }) => {
  const { session, loading } = useAuth();
  const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");
  const isAuthCallback =
    typeof window !== "undefined" &&
    (window.location.hash.includes("access_token") || new URLSearchParams(window.location.search).has("code"));
  const showHome = !loading && (!!session || isRecovery || isAuthCallback);
  // Signed-in parents never keep the welcome copy that ships inside index.html.
  useEffect(() => {
    if (showHome) removePrerender();
  }, [showHome]);
  if (loading) return null;
  if (session || isRecovery || isAuthCallback) return <>{home}</>;
  return <>{welcome}</>;
};

export default HomeGate;
