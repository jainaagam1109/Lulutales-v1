import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { storeInvite, redeemPendingInvite } from "@/lib/invite";

/** lulutales.in/i/CODE: remember the friend's invite, then sign in (or use it right away if signed in). */
const InviteLanding = () => {
  const { code = "" } = useParams();
  const { session, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (code) storeInvite(code);
    if (!session) {
      nav("/auth", { replace: true });
      return;
    }
    redeemPendingInvite()
      .catch(() => false)
      .then((ok) => nav(ok ? "/joined" : "/", { replace: true }));
  }, [code, session, loading, nav]);
  return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Opening your invite…</div>;
};

export default InviteLanding;
