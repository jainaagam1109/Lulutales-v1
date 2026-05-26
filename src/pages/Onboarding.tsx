import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PhoneShell } from "@/components/PhoneShell";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
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

const FAMILY_SETUPS = [
  { label: "Nuclear family", value: "Nuclear family" },
  { label: "Single parent", value: "Single parent" },
  { label: "Joint family", value: "Joint family" },
  { label: "Lives with grandparents", value: "Lives with grandparents" },
  { label: "Other", value: "Other" },
];

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please add your child's name 😊")
    .max(60)
    .regex(/^[A-Za-z\s'-]+$/, "Hmm, this should be letters only 😊"),
  age: z.number().int().min(1).max(18),
});

const Onboarding = () => {
  const nav = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [family, setFamily] = useState<string>("");
  const [familyOther, setFamilyOther] = useState<string>("");
  const [siblingAge, setSiblingAge] = useState<string>("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      nav("/auth", { replace: true });
      return;
    }
    // If a profile already exists for this user, skip onboarding entirely.
    (async () => {
      const { data: existing } = await supabase
        .from("child_profiles")
        .select("id, name, age")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (existing) {
        localStorage.setItem("lulutales_profile_id", existing.id);
        localStorage.setItem("lulutales_child_name", existing.name);
        localStorage.setItem("lulutales_child_age", String(existing.age));
        nav("/", { replace: true });
      }
    })();
  }, [session, authLoading, nav]);


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
    ? isNumeric(age)
      ? "valid"
      : "error"
    : "untouched";

  const submit = async () => {
    if (!session) return;
    setLoading(true);
    // Avoid duplicate profile creation if one already exists
    const { data: existing } = await supabase
      .from("child_profiles")
      .select("id, name, age")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (existing) {
      localStorage.setItem("lulutales_profile_id", existing.id);
      localStorage.setItem("lulutales_child_name", existing.name);
      localStorage.setItem("lulutales_child_age", String(existing.age));
      setLoading(false);
      nav("/");
      return;
    }
    setTouched({ name: true, age: true });
    const ageNum = Number(age);
    const parsed = schema.safeParse({ name, age: ageNum });
    if (!parsed.success) {
      setLoading(false);
      toast.error(parsed.error.errors[0].message);
      return;
    }
    const { data, error } = await supabase
      .from("child_profiles")
      .insert({
        name: name.trim(),
        age: ageNum,
        gender: gender || null,
        family_type: (family === "Other" ? familyOther.trim() : family) || null,
        sibling_age: siblingAge ? Number(siblingAge) : null,
        user_id: session.user.id,
      })
      .select()
      .single();
    setLoading(false);
    if (error || !data) {
      toast.error("Couldn't save. Try again.");
      return;
    }
    localStorage.setItem("lulutales_profile_id", data.id);
    localStorage.setItem("lulutales_child_name", data.name);
    localStorage.setItem("lulutales_child_age", String(data.age));
    nav("/");
  };

  return (
    <PhoneShell>
      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-3xl">
            🎙️
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Lulutales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Audio stories for curious kids</p>
        </div>

        <h2 className="mb-1 text-xl font-bold text-foreground">About your child</h2>
        <p className="mb-6 text-sm text-muted-foreground">We'll use this to personalise stories.</p>

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
            errorMessage="Looks like age should be a number 😊"
          />
        </div>

        <div className="mb-4">
          <FieldLabel optional tooltip="So we use the right pronouns in the story.">
            Gender
          </FieldLabel>
          <Select value={gender} onChange={setGender} options={GENDERS} placeholder="Select gender" />
        </div>

        <div className="mb-4">
          <FieldLabel optional tooltip="A quick overview of who's around your child.">
            Family setup
          </FieldLabel>
          <Select
            value={family}
            onChange={(v) => {
              setFamily(v);
              if (v !== "Other") setFamilyOther("");
            }}
            options={FAMILY_SETUPS}
            placeholder="Select family setup"
          />
          {family === "Other" && (
            <div className="mt-2">
              <TextInput
                value={familyOther}
                onChange={(e) => setFamilyOther(e.target.value)}
                placeholder="Tell us about your family setup…"
              />
            </div>
          )}
        </div>

        <div className="mb-8">
          <FieldLabel
            optional
            tooltip="If your child has a sibling, their age helps us write a more realistic family dynamic."
          >
            Sibling's age
          </FieldLabel>
          <TextInput
            value={siblingAge}
            onChange={(e) => setSiblingAge(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 3"
          />
        </div>


        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-full bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-opacity disabled:opacity-50"
        >
          {loading ? "Saving…" : "Continue →"}
        </button>
      </div>
    </PhoneShell>
  );
};

export default Onboarding;
