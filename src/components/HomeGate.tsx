import { ReactNode } from "react";
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
  if (loading) return null;
  if (session || isRecovery || isAuthCallback) return <>{home}</>;
  return <>{welcome}</>;
};

export default HomeGate;
