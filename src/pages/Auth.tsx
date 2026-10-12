import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PhoneShell } from "@/components/PhoneShell";
import { LuluLogo } from "@/components/LuluLogo";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/events";
import { pendingInvite, redeemPendingInvite } from "@/lib/invite";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_SECS = 60;

const friendly = (raw: string) => {
  const m = raw.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Too many tries. Please wait a minute and try again.";
  if (m.includes("expired") || m.includes("invalid") || m.includes("token"))
    return "That code didn’t work. Check the latest email, or send a new code.";
  return "Something went wrong. Please try again.";
};

/**
 * One sign-in for new and returning families: Google, or a 6-digit code sent by email.
 * After sign-in: families without a child go to child details; everyone else goes home.
 */
const Auth = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { session, loading } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const routed = useRef(false);
  const invited = !!pendingInvite();

  const nextPath = useMemo(() => {
    const raw = params.get("next");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
  }, [params]);

  // Signed in: decide where to go.
  useEffect(() => {
    if (loading || !session || routed.current) return;
    routed.current = true;
    (async () => {
      const { data: kids } = await (supabase as any)
        .from("child_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .neq("status", "deleted")
        .limit(1);
      if (!kids?.length) {
        nav(nextPath ? `/onboarding?next=${encodeURIComponent(nextPath)}` : "/onboarding", { replace: true });
        return;
      }
      if (pendingInvite()) await redeemPendingInvite();
      nav(nextPath ?? "/", { replace: true });
    })();
  }, [session, loading, nav, nextPath]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!EMAIL_RE.test(em)) return setError("Please enter a valid email.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: em, options: {
        shouldCreateUser: true,
        // The link in the email brings the parent back to the same site they asked from.
        emailRedirectTo: `${window.location.origin}/auth${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`,
      },
    });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    setEmail(em);
    setCode("");
    setStep("code");
    setWait(RESEND_SECS);
    trackEvent("signin_code_sent");
  };

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length < 6) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    trackEvent("signed_in", { method: "email_code" });
    // The session change sends the parent on.
  };

  const google = async () => {
    setBusy(true);
    const back = `${window.location.origin}/auth${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: back } });
    if (error) {
      setBusy(false);
      setError("Google sign-in didn’t work. Please try again or use your email.");
    }
  };

  if (session) {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Signing you in…</div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <main className="flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-6 md:justify-center">
        {step === "email" ? (
          <>
            <div className="mb-10">
              <LuluLogo size={34} />
            </div>
            {invited && (
              <span className="mb-3 inline-flex min-h-7 items-center self-start rounded-full bg-primary/10 px-3 text-[13px] font-semibold text-primary">
                Invited by a friend · you skip the wait
              </span>
            )}
            <h1 className="font-[Quicksand] text-[28px] font-bold leading-tight text-foreground">Welcome to LuluTales</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">New or returning, it’s one simple step.</p>

            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-card font-semibold text-foreground disabled:opacity-60"
            >
              <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or use your email
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={sendCode} noValidate>
              <label htmlFor="email" className="mb-2 block font-semibold text-foreground">
                Your email
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="name@example.com"
                className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-[16px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
              />
              {error && <p className="mt-2 text-sm !text-destructive" role="alert">{error}</p>}
              <button type="submit" disabled={busy || !email.trim()} className="mt-4 w-full bg-primary text-primary-foreground disabled:opacity-50">
                {busy ? "Sending…" : "Email me a code"}
              </button>
              <p className="mt-2 text-center text-sm text-muted-foreground">We’ll email you a 6-digit code. No password to remember.</p>
            </form>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="/terms" className="font-semibold text-primary">Terms</a> and{" "}
              <a href="/privacy" className="font-semibold text-primary">Privacy policy</a>.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="mb-6 inline-flex min-h-10 items-center gap-1 self-start text-sm font-semibold text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="font-[Quicksand] text-[28px] font-bold leading-tight text-foreground">Check your email</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">
              We sent a 6-digit code to <strong className="font-semibold text-foreground">{email}</strong>
            </p>
            <form onSubmit={verify} className="mt-6">
              <label htmlFor="code" className="sr-only">6-digit code</label>
              <input
                id="code"
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={8}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setCode(v);
                  setError(null);
                }}
                placeholder="••••••"
                className="h-16 w-full rounded-2xl border border-border bg-card text-center font-[Quicksand] text-[30px] font-bold tracking-[0.35em] text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
              />
              {error && <p className="mt-2 text-sm !text-destructive" role="alert">{error}</p>}
              <p className="mt-3 text-sm text-muted-foreground">
                The code works for 10 minutes. If it hasn’t arrived in a minute, check your spam folder.
              </p>
              <button type="submit" disabled={busy || code.length < 6} className="mt-5 w-full bg-primary text-primary-foreground disabled:opacity-50">
                {busy ? "Checking…" : "Continue"}
              </button>
            </form>
            <div className="mt-3 flex flex-col items-center gap-1">
              <button
                type="button"
                disabled={wait > 0 || busy}
                onClick={() => sendCode()}
                className="min-h-10 text-sm font-semibold text-primary disabled:text-muted-foreground"
              >
                {wait > 0 ? `Resend code in 0:${String(wait).padStart(2, "0")}` : "Resend code"}
              </button>
              <button type="button" onClick={() => setStep("email")} className="min-h-10 text-sm font-semibold text-primary">
                Use a different email
              </button>
            </div>
            <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
              Trouble signing in? Write to{" "}
              <a href="mailto:hello@lulutales.in" className="font-semibold text-primary">hello@lulutales.in</a>
            </p>
          </>
        )}
      </main>
    </PhoneShell>
  );
};

export default Auth;
