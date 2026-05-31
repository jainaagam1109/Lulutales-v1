import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PhoneShell } from "@/components/PhoneShell";

const schema = z
  .object({
    password: z.string().min(6, "Min 6 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

const ResetPassword = () => {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase auto-exchanges the recovery link into a session.
    // PASSWORD_RECOVERY event fires when the link is processed.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setBusy(false);
    if (error) return toast.error(error.message);
    await supabase.auth.signOut();
    toast.success("Password updated. Please log in.");
    nav("/auth", { replace: true });
  };

  return (
    <PhoneShell>
      <div className="flex-1 px-6 pb-10 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-3xl">
            🔒
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">LuluTales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set a new password</p>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">
            Validating your reset link…
          </p>
        ) : (
          <>
            <label className="mb-3 block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                New password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </label>
            <label className="mb-5 block">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm password
              </span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </label>
            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-full bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              {busy ? "Please wait…" : "Update password"}
            </button>
          </>
        )}
      </div>
    </PhoneShell>
  );
};

export default ResetPassword;
