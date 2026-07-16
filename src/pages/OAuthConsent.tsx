import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Typed shim for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; client_uri?: string };
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
  scopes?: string[];
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

function isSafeRelative(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id in URL.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load authorization request.");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError("No redirect returned by the authorization server.");
        return;
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "Something went wrong.");
    }
  }

  const clientName = details?.client?.name ?? "an app";
  const scopeList = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-glow">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-xl">🎙️</div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              LuluTales
            </div>
            <h1 className="text-lg font-bold text-foreground">
              Connect {clientName} to your account
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {!details && !error && (
          <p className="text-sm text-muted-foreground">Loading authorization request…</p>
        )}

        {details && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              This lets <span className="font-semibold text-foreground">{clientName}</span> use
              LuluTales as you. It does not bypass LuluTales' permissions or backend policies.
            </p>

            {scopeList.length > 0 && (
              <div className="mb-4 rounded-xl border border-border bg-background/60 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Requested access
                </div>
                <ul className="space-y-1 text-xs text-foreground">
                  {scopeList.map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {details.redirect_uri && (
              <div className="mb-5 text-[11px] text-muted-foreground">
                Will redirect to <span className="font-mono">{details.redirect_uri}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => decide(true)}
                disabled={busy}
                className="flex-1 rounded-full bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {busy ? "Please wait…" : "Approve"}
              </button>
              <button
                onClick={() => decide(false)}
                disabled={busy}
                className="flex-1 rounded-full border border-border bg-card py-3 text-sm font-bold text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export { isSafeRelative };
