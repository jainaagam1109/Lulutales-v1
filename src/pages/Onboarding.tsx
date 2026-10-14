import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PhoneShell } from "@/components/PhoneShell";
import { LuluLogo } from "@/components/LuluLogo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { loadActiveProfileForUser } from "@/lib/activeProfile";
import { trackEvent } from "@/lib/events";
import { track } from "@/lib/track";
import { redeemPendingInvite } from "@/lib/invite";
import {
  FieldLabel,
  TextInput,
  Select,
  isLettersOnly,
  isNumeric,
  ValidationState,
  CompanionFields,
  joinCompanion,
} from "@/components/StoryFormFields";

const GENDERS = [
  { label: "Girl", value: "Girl" },
  { label: "Boy", value: "Boy" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const AGE_HELPER = "Stories are crafted for ages 2–9.";
const AGE_ERROR = "Please enter an age between 2 and 9 😊";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please add your child's name 😊")
    .max(60)
    .regex(/^[A-Za-z\s'-]+$/, "Hmm, this should be letters only 😊"),
  age: z.number().int().min(2, AGE_ERROR).max(9, AGE_ERROR),
});

const Onboarding = () => {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const isAddMode =
    location.pathname === "/add-child" || searchParams.get("mode") === "add";
  const next = searchParams.get("next");
  const { session, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [companion, setCompanion] = useState<{ name: string; what: string }>({ name: "", what: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      nav("/auth", { replace: true });
      return;
    }
    if (isAddMode) return; // skip the auto-redirect; always allow adding another child
    // If a non-deleted profile already exists for this user, skip onboarding.
    (async () => {
      const { data: existing } = await (supabase as any)
        .from("child_profiles")
        .select("id, name, age, status")
        .eq("user_id", session.user.id)
        .neq("status", "deleted")
        .order("status", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1);
      const first = existing?.[0];
      if (first) {
        localStorage.setItem("lulutales_profile_id", first.id);
        localStorage.setItem("lulutales_child_name", first.name);
        localStorage.setItem("lulutales_child_age", String(first.age));
        nav(next ?? "/", { replace: true });
      }
    })();
  }, [session, authLoading, nav, isAddMode]);

  const nameState: ValidationState = !touched.name
    ? "untouched"
    : name.trim()
    ? isLettersOnly(name)
      ? "valid"
      : "error"
    : "untouched";
  const ageState: ValidationState = !touched.age
    ? "untouched"
    : age.trim()
    ? isNumeric(age) && Number(age) >= 2 && Number(age) <= 9
      ? "valid"
      : "error"
    : "untouched";

  const submit = async () => {
    if (!session) return;
    setTouched({ name: true, age: true });
    const ageNum = Number(age);
    const parsed = schema.safeParse({ name, age: ageNum });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    // In normal mode, avoid duplicate profile creation if one already exists.
    if (!isAddMode) {
      const { data: existing } = await (supabase as any)
        .from("child_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: true })
        .limit(1);
      const first = existing?.[0];
      if (first) {
        await loadActiveProfileForUser(session.user.id);
        setLoading(false);
        nav(next ?? "/", { replace: true });
        return;
      }
    }
    // Only the very first child insert may write status='active' directly.
    // Every later activation must go through set_active_profile.
    const { data: activeRows } = await (supabase as any)
      .from("child_profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .limit(1);
    const hasActive = !!activeRows?.[0];
    const { data, error } = await (supabase as any)
      .from("child_profiles")
      .insert({
        name: name.trim(),
        age: ageNum,
        gender: gender || null,
        companion: joinCompanion(companion.name, companion.what) || null,
        user_id: session.user.id,
        status: hasActive ? "inactive" : "active",
      })
      .select()
      .single();
    if (error || !data) {
      setLoading(false);
      toast.error("Couldn't save. Try again.");
      return;
    }
    trackEvent("onboarding_completed", { mode: isAddMode ? "add" : "normal" });
    if (!hasActive) {
      await loadActiveProfileForUser(session.user.id);
    }
    await qc.invalidateQueries();
    setLoading(false);
    void track("profile_created", { profile_id: data.id, age: data.age, is_add: isAddMode });
    if (!isAddMode) {
      await redeemPendingInvite().catch(() => false);
      await qc.invalidateQueries();
      nav(next ?? "/joined", { replace: true });
    } else {
      toast.success(`${data.name} added`);
      nav("/profiles");
    }
  };


  const ageNum = Number(age);
  const g = gender === "Girl" ? "girl" : gender === "Boy" ? "boy" : null;
  const pitch =
    ageNum >= 2 && ageNum <= 9
      ? `Written for a ${ageNum}-year-old${g ? ` ${g}` : ""}: ${
          ageNum <= 3 ? "short, sing-song sentences and one simple feeling at a time." : ageNum <= 6 ? "short sentences, a gentle pace and one feeling at a time." : "richer words, a real plot and feelings they can talk about."
        }`
      : null;
  const shownName = name.trim() || "your child";

  return (
    <PhoneShell>
      <main className="flex-1 overflow-y-auto px-6 pb-8 pt-6">
        {isAddMode ? (
          <button type="button" onClick={() => nav("/profiles")} className="mb-4 inline-flex min-h-10 items-center text-sm font-semibold text-foreground">
            <X className="mr-1 h-4 w-4" /> Cancel
          </button>
        ) : (
          <div className="mb-6 text-sm font-semibold text-muted-foreground">Last step</div>
        )}
        <h1 className="font-[Quicksand] text-[28px] font-bold leading-tight text-foreground">
          {isAddMode ? "Add a child" : "Who are the stories for?"}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {isAddMode ? "Each child gets their own stories." : "You can add family names, or another child, later."}
        </p>

        <label className="mt-6 block">
          <span className="mb-2 block font-semibold text-foreground">Your child’s first name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="e.g. Aanya"
            maxLength={60}
            autoComplete="off"
            aria-invalid={nameState === "error"}
            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-[16px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
          />
          {nameState === "error" && <span className="mt-1.5 block text-sm text-destructive">Please use letters only.</span>}
        </label>

        <div className="mt-5">
          <span className="mb-2 block font-semibold text-foreground">Age</span>
          <div role="radiogroup" aria-label="Age" className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={age === String(n)}
                onClick={() => setAge(String(n))}
                className={`min-h-12 rounded-2xl border text-[17px] font-semibold ${
                  age === String(n) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="font-semibold text-foreground">Girl or boy?</span>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <div role="radiogroup" aria-label="Girl or boy" className="flex flex-wrap gap-2">
            {[
              { v: "Girl", l: "Girl" },
              { v: "Boy", l: "Boy" },
              { v: "Prefer not to say", l: "Rather not say" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={gender === o.v}
                onClick={() => setGender(gender === o.v ? "" : o.v)}
                className={`min-h-11 rounded-full border px-5 text-[15px] font-semibold ${
                  gender === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {pitch && <p className="mt-5 rounded-[18px] bg-accent p-4 text-sm text-foreground/80">{pitch}</p>}
      </main>

      <footer className="border-t border-border bg-background px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        <button type="button" onClick={submit} disabled={loading || !name.trim() || !age} className="w-full bg-primary text-primary-foreground disabled:opacity-50">
          {loading ? "Saving…" : isAddMode ? "Add child" : "Continue"}
        </button>
        {!isAddMode && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            By continuing, you confirm you’re {shownName}’s parent or guardian. We use their name only to write their stories, and keep it private.
          </p>
        )}
      </footer>
    </PhoneShell>
  );
};

export default Onboarding;
