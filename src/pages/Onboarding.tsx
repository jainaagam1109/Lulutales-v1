import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PhoneShell } from "@/components/PhoneShell";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { loadActiveProfileForUser } from "@/lib/activeProfile";
import { trackEvent } from "@/lib/events";
import { track } from "@/lib/track";
import {
  FieldLabel,
  TextInput,
  Select,
  isLettersOnly,
  isNumeric,
  ValidationState,
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
      nav(next ?? "/", { replace: true });
    } else {
      toast.success(`${data.name} added`);
      nav("/profiles");
    }
  };


  const headingText = isAddMode ? "Add a child" : "Tell us about your child";

  return (
    <PhoneShell>
      <main className="relative flex-1 overflow-y-auto px-6 pt-12 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          aria-label={isAddMode ? "Close" : "Skip"}
          onClick={() => nav(isAddMode ? "/profiles" : "/")}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-primary-deep"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-3xl">
            🎙️
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">LuluTales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Audio stories for curious kids</p>
        </div>

        <h2 className="mb-1 text-xl font-bold text-foreground">{headingText}</h2>
        <p className="mb-3 text-sm text-muted-foreground">We'll use this to personalise stories.</p>
        <p className="mb-6 rounded-xl bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
          Your child's details stay private to your account — never sold or shared — and are used only to personalise stories.
        </p>

        <div className="mb-4">
          <FieldLabel tooltip="Your child's first name — used to personalise the story.">
            Child's name
          </FieldLabel>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="e.g. Aanya"
            maxLength={60}
            state={nameState}
            errorMessage="Hmm, this should be letters only 😊"
          />
        </div>

        <div className="mb-4">
          <FieldLabel tooltip="Helps us pitch the language and length just right.">Age</FieldLabel>
          <TextInput
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, age: true }))}
            inputMode="numeric"
            placeholder="e.g. 5"
            state={ageState}
            errorMessage={AGE_ERROR}
          />
          {ageState !== "error" && (
            <p className="mt-1 text-[11px] text-muted-foreground">{AGE_HELPER}</p>
          )}
        </div>

        <div className="mb-8">
          <FieldLabel optional tooltip="So we use the right pronouns in the story.">
            Gender
          </FieldLabel>
          <Select value={gender} onChange={setGender} options={GENDERS} placeholder="Select gender" />
        </div>
      </main>

      <div
        className="border-t border-border bg-card px-6 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-full bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-opacity disabled:opacity-50"
        >
          {loading ? "Saving…" : isAddMode ? "Add child →" : "Continue →"}
        </button>
      </div>
    </PhoneShell>
  );
};

export default Onboarding;
