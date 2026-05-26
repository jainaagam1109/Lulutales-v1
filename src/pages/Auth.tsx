import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters").max(72),
});

const Auth = () => {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) nav("/", { replace: true });
  }, [session, loading, nav]);

  const submit = async () => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setBusy(true);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({
      email: parsed.data.email,
      password: parsed.data.password,
      ...(mode === "signup" ? { options: { emailRedirectTo: window.location.origin } } : {}),
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    // session change will trigger redirect
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  };

  return (
    <PhoneShell>
      <div className="flex-1 px-6 pb-10 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-3xl">
            🎙️
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Lulutales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        <div className="mb-5 flex rounded-full border border-border bg-card p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors ${
                mode === m ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

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
        <label className="mb-5 block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            placeholder="••••••••"
          />
        </label>

        <button
          onClick={submit}
          disabled={busy}
          className="mb-3 w-full rounded-full bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={google}
          disabled={busy}
          className="w-full rounded-full border border-border bg-card py-3.5 text-sm font-bold text-foreground disabled:opacity-50"
        >
          Continue with Google
        </button>
      </div>
    </PhoneShell>
  );
};

export default Auth;
