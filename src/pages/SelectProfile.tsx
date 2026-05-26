import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PhoneShell } from "@/components/PhoneShell";
import { useAuth } from "@/hooks/useAuth";

type Kid = { id: string; name: string; age: number };

const SelectProfile = () => {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [kids, setKids] = useState<Kid[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      nav("/auth", { replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("child_profiles")
        .select("id, name, age")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      setKids(data ?? []);
      setBusy(false);
    })();
  }, [session, loading, nav]);

  const pick = (kid: Kid) => {
    localStorage.setItem("lulutales_profile_id", kid.id);
    localStorage.setItem("lulutales_child_name", kid.name);
    localStorage.setItem("lulutales_child_age", String(kid.age));
    nav("/", { replace: true });
  };

  return (
    <PhoneShell>
      <div className="flex-1 px-6 pb-10 pt-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-foreground">Who's listening?</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick a child profile</p>
        </div>

        {busy ? (
          <div className="text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {kids.map((k) => (
              <button
                key={k.id}
                onClick={() => pick(k)}
                className="flex flex-col items-center rounded-3xl border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-2xl font-extrabold text-primary-foreground shadow-glow">
                  {k.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-sm font-bold text-foreground">{k.name}</div>
                <div className="text-xs text-muted-foreground">{k.age} years</div>
              </button>
            ))}
            <button
              onClick={() => nav("/onboarding")}
              className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/50 p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border border-border">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold">Add child</div>
            </button>
          </div>
        )}
      </div>
    </PhoneShell>
  );
};

export default SelectProfile;
