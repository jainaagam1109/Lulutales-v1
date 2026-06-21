import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/events";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters").max(72),
});
const emailOnlySchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

type Mode = "signin" | "signup" | "forgot";

type EmailAccountInfo = {
  exists: boolean;
  has_password: boolean;
  providers: string[];
};

/**
 * Look up which sign-in methods an email is registered with.
 *
 * Relies on the Postgres RPC `auth_methods_for_email` (created in the Supabase
 * SQL editor). If the function isn't installed, or anything goes wrong, this
 * resolves to `null` and callers fall back to a generic-but-helpful message —
 * so the screen works correctly either way.
 */
async function lookupEmailAccount(email: string): Promise<EmailAccountInfo | null> {
  try {
    // Cast to `any` so this compiles even before the generated Supabase types
    // include the new RPC. (They will once types are regenerated.)
    const { data, error } = await (supabase as any).rpc("auth_methods_for_email", {
      p_email: email,
    });
    if (error || !data) return null;
    const obj = data as { exists?: boolean; has_password?: boolean; providers?: unknown };
    return {
      exists: !!obj.exists,
      has_password: !!obj.has_password,
      providers: Array.isArray(obj.providers) ? (obj.providers as string[]) : [],
    };
  } catch {
    return null;
  }
}

/** A Google-only account = registered with Google and no usable password set. */
function isGoogleOnly(info: EmailAccountInfo | null): boolean {
  return !!info && info.providers.includes("google") && !info.has_password;
}

/** Turn a raw Supabase sign-in error into a clear, user-facing message. */
function friendlySignInError(rawMessage: string, info: EmailAccountInfo | null): string {
  const msg = rawMessage.toLowerCase();

  // Supabase returns "Invalid login credentials" for BOTH a wrong password AND
  // an email that isn't registered (deliberate, to prevent account enumeration).
  // We disambiguate using the account lookup so the user isn't left guessing.
  if (msg.includes("invalid login credentials")) {
    if (info) {
      if (!info.exists) {
        return 'We couldn\'t find an account with that email. Switch to "Sign up" to create one.';
      }
      if (isGoogleOnly(info)) {
        return 'This account was created with Google. Tap "Continue with Google" below to sign in.';
      }
      if (info.providers.includes("google")) {
        // Has a password but Google is also linked — likely a wrong password,
        // but offer Google as an alternate route.
        return 'Incorrect password. You can also sign in with "Continue with Google" below.';
      }
      return "Incorrect email or password. Please try again.";
    }
    // RPC not available → safe, still-helpful generic nudge.
    return 'Incorrect email or password. If you signed up with Google, use "Continue with Google" below instead.';
  }

  if (msg.includes("email not confirmed")) {
    return "Please confirm your email first — check your inbox for the verification link.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return rawMessage || "Something went wrong while signing in. Please try again.";
}

/** Turn a raw Supabase sign-up error into a clear, user-facing message. */
function friendlySignUpError(rawMessage: string): string {
  const msg = rawMessage.toLowerCase();
  if (msg.includes("password")) {
    return "Password must be at least 6 characters.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return rawMessage || "Something went wrong while creating your account. Please try again.";
}

const Auth = () => {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // When we detect the email belongs to a Google account, highlight that button.
  const [suggestGoogle, setSuggestGoogle] = useState(false);

  useEffect(() => {
    if (!loading && session) nav("/", { replace: true });
  }, [session, loading, nav]);

  // Clear the Google hint whenever the user edits the email.
  useEffect(() => {
    setSuggestGoogle(false);
  }, [email]);

  const submit = async () => {
    if (mode === "forgot") {
      const parsed = emailOnlySchema.safeParse({ email });
      if (!parsed.success) return toast.error(parsed.error.errors[0].message);
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("If an account exists for that email, we've sent a reset link.");
      setMode("signin");
      return;
    }

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setBusy(true);
    setSuggestGoogle(false);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) {
        // Only spend a lookup on the ambiguous credentials error.
        const info = error.message.toLowerCase().includes("invalid login credentials")
          ? await lookupEmailAccount(parsed.data.email)
          : null;
        setBusy(false);
        if (isGoogleOnly(info)) setSuggestGoogle(true);
        // Clear the password only when retyping it wouldn't help.
        if (info && (!info.exists || isGoogleOnly(info))) setPassword("");
        toast.error(friendlySignInError(error.message, info));
        return;
      }
      trackEvent("logged_in", { method: "email" });
      setBusy(false);
      // session change will trigger redirect
      return;
    }

    // signup
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: window.location.origin },
    });

    // Supabase hides "user already exists" on signup: it returns either an
    // "already registered" error OR a user object with an empty identities array.
    const alreadyExists =
      (error && /already registered|already exists|user already/i.test(error.message)) ||
      (!!data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);

    if (alreadyExists) {
      const info = await lookupEmailAccount(parsed.data.email);
      setBusy(false);
      setPassword("");
      if (isGoogleOnly(info)) {
        setSuggestGoogle(true);
        toast('You already have a Google account. Tap "Continue with Google" below.');
      } else {
        toast("Welcome back to LuluTales! Please login 👋");
        setMode("signin");
      }
      return;
    }

    setBusy(false);
    if (error) return toast.error(friendlySignUpError(error.message));
    toast.success("Account created. Check your email to confirm your account before logging in.");
    trackEvent("signed_up", { method: "email" });
  };

  const google = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message ?? "Google sign-in failed");
    }
    // On success the browser redirects; leave busy = true.
  };

  const submitLabel = mode === "signin" ? "Login" : mode === "signup" ? "Create account" : "Send reset link";
  const subtitle =
    mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";

  return (
    <PhoneShell>
      <div className="flex-1 px-6 pb-10 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-3xl">
            🎙️
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">LuluTales</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {mode !== "forgot" && (
          <div className="mb-5 flex rounded-full border border-border bg-card p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors ${
                  mode === m ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Login" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        <label className="mb-3 block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            placeholder="you@example.com"
          />
        </label>

        {mode !== "forgot" &&
          (() => {
            const tooShort = mode === "signup" && password.length > 0 && password.length < 6;
            return (
              <label className="mb-2 block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:border-primary ${
                    tooShort ? "border-destructive" : "border-border"
                  }`}
                  placeholder="••••••••"
                />
                {mode === "signup" && (
                  <span
                    className={`mt-1.5 block text-[11px] ${tooShort ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    Use at least 6 characters.
                  </span>
                )}
              </label>
            );
          })()}

        {mode === "signin" && (
          <div className="mb-4 text-right">
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <div className="mb-4 text-right">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Back to login
            </button>
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="mb-3 w-full rounded-full bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {busy ? "Please wait…" : submitLabel}
        </button>

        {mode !== "forgot" && (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {suggestGoogle && (
              <p className="mb-2 text-center text-xs font-medium text-primary">
                This email is registered with Google — use the button below.
              </p>
            )}

            <button
              onClick={google}
              disabled={busy}
              className={`w-full rounded-full border py-3.5 text-sm font-bold text-foreground disabled:opacity-50 ${
                suggestGoogle ? "border-primary ring-2 ring-primary/40" : "border-border bg-card"
              }`}
            >
              Continue with Google
            </button>
          </>
        )}
      </div>
    </PhoneShell>
  );
};

export default Auth;
