import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { loading } = useAuth();
  const isAdmin = useIsAdmin();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};
