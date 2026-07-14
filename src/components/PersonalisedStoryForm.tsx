import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { FloatingMiniPlayer } from "@/components/FloatingMiniPlayer";
import {
  FieldLabel,
  TextInput,
  Select,
  Section,
  AddressTermsEditor,
  AddressTerm,
  parseAddressTerms,
  serializeAddressTerms,
  isLettersOnly,
  isNumeric,
  ValidationState,
} from "@/components/StoryFormFields";
import { createPersonalisedStory } from "@/lib/stories";
import { trackEvent } from "@/lib/events";
import { getThemeVisual } from "@/lib/themeEmoji";
import { supabase } from "@/integrations/supabase/client";
import { getThemeOptions, CUSTOM_THEME_VALUE } from "@/lib/themeCatalog";

type Props = {
  storyType: "personalised_audio" | "bedtime_text";
  pageTitle: string;
  backTo?: string;
};

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

const PERSONALITY_BY_AGE = [
  { maxAge: 3, values: ["Playful", "Curious", "Energetic", "Affectionate"] },
  { maxAge: 5, values: ["Playful", "Curious", "Shy", "Energetic", "Kind", "Imaginative"] },
  { maxAge: 7, values: ["Playful", "Curious", "Shy", "Confident", "Kind", "Energetic", "Imaginative", "Stubborn"] },
  { maxAge: 9, values: ["Curious", "Shy", "Confident", "Emotional", "Stubborn", "Kind", "Imaginative", "Independent"] },
  { maxAge: 99, values: ["Curious", "Shy", "Playful", "Confident", "Emotional", "Stubborn", "Kind", "Energetic", "Imaginative", "Independent"] },
];

function personalitiesForAge(ageStr: string) {
  const age = parseInt(ageStr, 10);
  const bucket = isNaN(age)
    ? PERSONALITY_BY_AGE[PERSONALITY_BY_AGE.length - 1]
    : PERSONALITY_BY_AGE.find((b) => age <= b.maxAge) ?? PERSONALITY_BY_AGE[PERSONALITY_BY_AGE.length - 1];
  return [...bucket.values, "Other"].map((p) => ({ label: p, value: p }));
}

const HOME_TYPES = [
  { label: "Apartment", value: "Apartment" },
  { label: "Independent House", value: "Independent House" },
  { label: "Gated Society", value: "Gated Society" },
  { label: "Other", value: "Other" },
];

type FormState = {
  name: string;
  age: string;
  gender: string;
  family_type_choice: string;
  family_type_custom: string;
  city: string;
  personality_choice: string;
  personality_custom: string;
  home_type_choice: string;
  home_type_custom: string;
  family_members: string;
  sibling_age: string;
  address_terms: AddressTerm[];
  theme: string;
  occasion: string;
  language: "english" | "hindi";
};

const emptyForm: FormState = {
  name: "",
  age: "",
  gender: "",
  family_type_choice: "",
  family_type_custom: "",
  city: "",
  personality_choice: "",
  personality_custom: "",
  home_type_choice: "",
  home_type_custom: "",
  family_members: "",
  sibling_age: "",
  address_terms: [],
  theme: "",
  occasion: "",
  language: "english",
};

const isHindiEligible = (ageStr: string) => {
  const n = parseInt(ageStr, 10);
  return !isNaN(n) && n >= 2 && n <= 6;
};

const matchToOption = (raw: string, options: { value: string }[]): { choice: string; custom: string } => {
  const v = (raw ?? "").trim();
  if (!v) return { choice: "", custom: "" };
  const found = options.find((o) => o.value.toLowerCase() === v.toLowerCase());
  if (found) return { choice: found.value, custom: "" };
  return { choice: "Other", custom: v };
};

const resolveChoice = (choice: string, custom: string) =>
  choice === "Other" ? custom.trim() : choice.trim();

export const PersonalisedStoryForm = ({ storyType, pageTitle, backTo = "/magic-hub" }: Props) => {
  const nav = useNavigate();
  const location = useLocation();
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;
  const [format, setFormat] = useState<"personalised_audio" | "bedtime_text">(storyType);

  useEffect(() => {
    if (!profileId) {
      toast.info("Tell us about your child to create personalised stories.");
      nav(`/onboarding?next=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showIdentityConfirm, setShowIdentityConfirm] = useState(false);
  const originalProfile = useRef<{ name: string; age: string; gender: string } | null>(null);
  const [themeChoice, setThemeChoice] = useState<string>("");
  const [customTheme, setCustomTheme] = useState<string>("");
  const themeOptions = useMemo(() => getThemeOptions(form.age), [form.age]);
  const prevAgeRef = useRef<string>("");
  useEffect(() => {
    if (prevAgeRef.current && prevAgeRef.current !== form.age) {
      setThemeChoice("");
      setCustomTheme("");
      setForm((f) => ({ ...f, theme: "" }));
    }
    prevAgeRef.current = form.age;
  }, [form.age]);

  useEffect(() => {
    if (!isHindiEligible(form.age) && form.language === "hindi") {
      setForm((f) => ({ ...f, language: "english" }));
    }
  }, [form.age, form.language]);



  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("child_profiles")
          .select(
            "name, age, gender, family_type, city, personality, home_type, family_members, family_address_terms, sibling_age, last_theme, last_occasion"
          )
          .eq("id", profileId)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          // Stale id — clear so RequireAuth re-runs selection next nav
          console.warn("[PersonalisedStoryForm] profile id not found, clearing localStorage", profileId);
          localStorage.removeItem("lulutales_profile_id");
          const cachedName = localStorage.getItem("lulutales_child_name") ?? "";
          const cachedAge = localStorage.getItem("lulutales_child_age") ?? "";
          setForm((f) => ({ ...f, name: cachedName, age: cachedAge }));
          toast.info("Couldn't load saved profile — please re-enter details.");
          setLoading(false);
          return;
        }
        const initialOptions = personalitiesForAge(data.age != null ? String(data.age) : "");
        const personality = matchToOption((data as any).personality ?? "", initialOptions);
        const home = matchToOption((data as any).home_type ?? "", HOME_TYPES);
        const family = matchToOption((data as any).family_type ?? "", FAMILY_SETUPS);
        originalProfile.current = {
          name: data.name ?? "",
          age: data.age != null ? String(data.age) : "",
          gender: data.gender ?? "",
        };
        setForm({
          name: data.name ?? "",
          age: data.age != null ? String(data.age) : "",
          gender: data.gender ?? "",
          family_type_choice: family.choice,
          family_type_custom: family.custom,
          city: data.city ?? "",
          personality_choice: personality.choice,
          personality_custom: personality.custom,
          home_type_choice: home.choice,
          home_type_custom: home.custom,
          family_members: data.family_members ?? "",
          sibling_age: (data as any).sibling_age != null ? String((data as any).sibling_age) : "",
          address_terms: parseAddressTerms(data.family_address_terms ?? ""),
          theme: "",
          occasion: (data as any).last_occasion ?? "",
          language: "english",
        });
      } catch (e) {
        console.error("[PersonalisedStoryForm] prefill failed", e);
        const cachedName = localStorage.getItem("lulutales_child_name") ?? "";
        const cachedAge = localStorage.getItem("lulutales_child_age") ?? "";
        setForm((f) => ({ ...f, name: cachedName, age: cachedAge }));
        toast.info("Couldn't load saved profile — please re-enter details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);


  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const markTouched = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  /* ---- field validation ---- */
  const nameState: ValidationState = !touched.name
    ? "untouched"
    : form.name.trim()
    ? isLettersOnly(form.name)
      ? "valid"
      : "error"
    : "untouched";
  const ageState: ValidationState = !touched.age
    ? "untouched"
    : form.age.trim()
    ? isNumeric(form.age) && Number(form.age) >= 2 && Number(form.age) <= 9
      ? "valid"
      : "error"
    : "untouched";
  const themeState: ValidationState = !touched.theme
    ? "untouched"
    : form.theme.trim()
    ? "valid"
    : "error";

  const childName = useMemo(() => form.name.trim() || "your child", [form.name]);

  const personalityOptions = useMemo(() => personalitiesForAge(form.age), [form.age]);

  useEffect(() => {
    if (!form.personality_choice) return;
    const inList = personalityOptions.some((o) => o.value === form.personality_choice);
    if (!inList) {
      setForm((f) => ({ ...f, personality_choice: "", personality_custom: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.age]);

  const proceedWithSubmit = async (updateProfile: boolean) => {
    if (!profileId) return;
    const personality = resolveChoice(form.personality_choice, form.personality_custom);
    const home_type = resolveChoice(form.home_type_choice, form.home_type_custom);
    const family_address_terms = serializeAddressTerms(form.address_terms);

    setSubmitting(true);
    try {
      const created = await createPersonalisedStory({
        title: `${form.name.trim() || "Your child"}'s ${form.theme.trim()} Story`,
        theme: form.theme.trim(),
        description: null,
        story_type: format,
        age_group: form.age || null,
        child_profile_id: profileId,
        thumbnail: getThemeVisual(form.theme.trim()).emoji,
        generation_params: {
          name: form.name.trim(),
          age: form.age.trim(),
          gender: form.gender,
          family_type: resolveChoice(form.family_type_choice, form.family_type_custom),
          city: form.city.trim(),
          personality,
          home_type,
          family_members: form.family_members.trim(),
          family_address_terms,
          sibling_age: form.sibling_age.trim() || null,
          theme: form.theme.trim(),
          occasion: form.occasion.trim() || null,
          language: isHindiEligible(form.age) ? form.language : "english",
        },
      });

      trackEvent("story_requested", {
        story_type: format,
        theme: form.theme.trim(),
        occasion: form.occasion.trim() || null,
        language: isHindiEligible(form.age) ? form.language : "english",
        age_group: form.age || null,
      });

      // Persist details back to the child profile so the next story prefills.
      const payload: Record<string, unknown> = {
        last_theme: form.theme.trim() || null,
        last_occasion: form.occasion.trim() || null,
        family_type: resolveChoice(form.family_type_choice, form.family_type_custom) || null,
        personality,
        home_type,
        city: form.city.trim() || null,
        family_members: form.family_members.trim() || null,
        family_address_terms,
        sibling_age: form.sibling_age ? Number(form.sibling_age) : null,
      };
      if (updateProfile) {
        payload.name = form.name.trim();
        payload.age = form.age ? Number(form.age) : null;
        payload.gender = form.gender || null;
      }
      const { error: updateErr } = await supabase
        .from("child_profiles")
        .update(payload as any)
        .eq("id", profileId);
      if (updateErr) {
        console.error("[PersonalisedStoryForm] profile update failed", updateErr);
        toast.error("Story saved, but couldn't update profile details.");
      }


      toast.success("Story request saved! We'll generate it shortly.");
      nav(`/generating/${created.id}`);
    } catch (e: any) {
      console.error("[PersonalisedStoryForm] save failed", e);
      toast.error("Could not save story — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (!profileId) {
      toast.error("Please complete onboarding first.");
      return;
    }
    setTouched((t) => ({ ...t, name: true, age: true, theme: true }));
    if (!form.name.trim() || !isLettersOnly(form.name)) {
      toast.error("Please enter a valid name (letters only).");
      return;
    }
    if (!form.age.trim() || !isNumeric(form.age)) {
      toast.error("Please enter an age between 2 and 9 😊");
      return;
    }
    const ageNum = Number(form.age);
    if (ageNum < 2 || ageNum > 9) {
      toast.error("Please enter an age between 2 and 9 😊");
      return;
    }
    if (!form.theme.trim()) {
      toast.error("Please add a theme for the story.");
      return;
    }

    const orig = originalProfile.current;
    if (
      orig &&
      (orig.name !== form.name || orig.age !== form.age || orig.gender !== form.gender)
    ) {
      setShowIdentityConfirm(true);
      return;
    }
    void proceedWithSubmit(false);
  };

  return (
    <PhoneShell>
      <header className="px-5 pt-4 pb-2">
        <button onClick={() => nav(backTo)} className="mb-3 flex items-center gap-1 text-xs text-primary-deep">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-xl font-extrabold text-foreground">{pageTitle}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Tell us a little about {childName} — only the basics are required. Anything you add helps us
          make the story feel personal.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
        {!profileId && (
          <div className="flex items-start gap-2 rounded-2xl border border-tag-warm-border bg-tag-warm-bg p-3 text-xs text-tag-warm-fg">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              No child profile found.{" "}
              <Link to="/onboarding" className="font-bold underline">
                Please complete onboarding first.
              </Link>
            </div>
          </div>
        )}

        <p className="rounded-xl bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
          Your child's details stay private to your account — never sold or shared — and are used only to personalise stories.
        </p>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            Loading profile…
          </div>
        ) : (
          <>
            {/* Basic details */}
            <Section title="Basic details" subtitle="The essentials we need to begin." defaultOpen>
              <div>
                <FieldLabel tooltip="Your child's first name — used to personalise the story.">Name</FieldLabel>
                <TextInput
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  onBlur={() => markTouched("name")}
                  placeholder="e.g. Aanya"
                  state={nameState}
                  errorMessage="Hmm, this should be letters only 😊"
                />
              </div>
              <div>
                <FieldLabel tooltip="Helps us pitch the language and length just right.">Age</FieldLabel>
                <TextInput
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  onBlur={() => markTouched("age")}
                  inputMode="numeric"
                  placeholder="e.g. 5"
                  state={ageState}
                  errorMessage="Please enter an age between 2 and 9 😊"
                />
                {ageState !== "error" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Stories are crafted for ages 2–9.</p>
                )}
              </div>
              <div>
                <FieldLabel tooltip="So we use the right pronouns in the story.">Gender</FieldLabel>
                <Select
                  value={form.gender}
                  onChange={(v) => set("gender", v)}
                  options={GENDERS}
                  placeholder="Select gender"
                />
              </div>
              <div>
                <FieldLabel tooltip="Choose the language the story will be written in.">Language</FieldLabel>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set("language", "english")}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                      form.language === "english"
                        ? "border-primary bg-gradient-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    disabled={!isHindiEligible(form.age)}
                    onClick={() => set("language", "hindi")}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                      form.language === "hindi"
                        ? "border-primary bg-gradient-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border`}
                  >
                    Hindi
                  </button>
                </div>
                {!isHindiEligible(form.age) && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Hindi is available for ages 2–6.</p>
                )}
              </div>
            </Section>

            {/* Family context */}
            <Section
              title="Family context"
              subtitle="Make the story feel like home."
              optional
              defaultOpen={false}
            >
              <div>
                <FieldLabel tooltip="This gives a quick overview. You can add more details about family members below.">
                  Family setup
                </FieldLabel>
                <Select
                  value={form.family_type_choice}
                  onChange={(v) => {
                    set("family_type_choice", v);
                    if (v !== "Other") set("family_type_custom", "");
                  }}
                  options={FAMILY_SETUPS}
                  placeholder="Select family setup"
                />
                {form.family_type_choice === "Other" && (
                  <div className="mt-2">
                    <TextInput
                      value={form.family_type_custom}
                      onChange={(e) => set("family_type_custom", e.target.value)}
                      placeholder="Tell us about your family setup…"
                    />
                  </div>
                )}
              </div>
              <div>
                <FieldLabel tooltip="The people who appear around your child every day.">
                  Family members
                </FieldLabel>
                <TextInput
                  value={form.family_members}
                  onChange={(e) => set("family_members", e.target.value)}
                  placeholder="e.g. Father, Mother, Grandparents"
                />
              </div>
              <div>
                <FieldLabel
                  optional
                  tooltip="If your child has a sibling, their age helps us write a more realistic family dynamic."
                >
                  Sibling's age
                </FieldLabel>
                <TextInput
                  value={form.sibling_age}
                  onChange={(e) => set("sibling_age", e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 3"
                />
              </div>
              <div>
                <FieldLabel tooltip="Helps us make the story feel more personal and familiar.">
                  Family address terms
                </FieldLabel>
                <p className="-mt-1 mb-2 text-[11px] text-muted-foreground">
                  e.g. Mother → Mummy, Father → Papa, Dog → Doggo
                </p>
                <AddressTermsEditor
                  value={form.address_terms}
                  onChange={(next) => set("address_terms", next)}
                />
              </div>
            </Section>

            {/* Environment */}
            <Section
              title="Environment"
              subtitle="Where the world of the story lives."
              optional
              defaultOpen={false}
            >
              <div>
                <FieldLabel tooltip="Adds local flavour and familiar places.">City</FieldLabel>
                <TextInput
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="e.g. Bengaluru"
                />
              </div>
              <div>
                <FieldLabel tooltip="So the setting feels like your child's everyday world." optional>
                  Home type
                </FieldLabel>
                <Select
                  value={form.home_type_choice}
                  onChange={(v) => {
                    set("home_type_choice", v);
                    if (v !== "Other") set("home_type_custom", "");
                  }}
                  options={HOME_TYPES}
                  placeholder="Select home type"
                />
                {form.home_type_choice === "Other" && (
                  <div className="mt-2">
                    <TextInput
                      value={form.home_type_custom}
                      onChange={(e) => set("home_type_custom", e.target.value)}
                      placeholder="Tell us more…"
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* Personality & Story */}
            <Section title="Personality & story" subtitle="What makes this story uniquely theirs." defaultOpen>
              <div>
                <FieldLabel tooltip="Shapes how the child behaves in the story.">Personality</FieldLabel>
                <Select
                  value={form.personality_choice}
                  onChange={(v) => {
                    set("personality_choice", v);
                    if (v !== "Other") set("personality_custom", "");
                  }}
                  options={personalityOptions}
                  placeholder="e.g. playful, shy, curious"
                />
                {form.personality_choice === "Other" && (
                  <div className="mt-2">
                    <TextInput
                      value={form.personality_custom}
                      onChange={(e) => set("personality_custom", e.target.value)}
                      placeholder="Tell us more…"
                    />
                  </div>
                )}
              </div>
              <div>
                <FieldLabel tooltip="What value or lesson should the story teach?">Theme</FieldLabel>
                {themeOptions.length > 0 ? (
                  <>
                    <Select
                      value={themeChoice}
                      onChange={(v) => {
                        setThemeChoice(v);
                        markTouched("theme");
                        if (v === CUSTOM_THEME_VALUE) {
                          set("theme", customTheme.trim());
                        } else {
                          set("theme", v);
                        }
                      }}
                      options={[
                        ...themeOptions,
                        { label: "Custom (type your own)", value: CUSTOM_THEME_VALUE },
                      ]}
                      placeholder="Pick a theme"
                      state={themeState}
                    />
                    {themeChoice === CUSTOM_THEME_VALUE && (
                      <div className="mt-2">
                        <TextInput
                          value={customTheme}
                          onChange={(e) => {
                            setCustomTheme(e.target.value);
                            set("theme", e.target.value);
                          }}
                          onBlur={() => markTouched("theme")}
                          placeholder="e.g. Friendship, Courage, Sharing"
                          state={themeState}
                          errorMessage="A short theme helps us start the story."
                        />
                      </div>
                    )}
                    {themeState === "error" && themeChoice !== CUSTOM_THEME_VALUE && (
                      <p className="mt-1 text-[11px] text-destructive">A short theme helps us start the story.</p>
                    )}
                  </>
                ) : (
                  <TextInput
                    value={form.theme}
                    onChange={(e) => set("theme", e.target.value)}
                    onBlur={() => markTouched("theme")}
                    placeholder="e.g. Friendship, Courage, Sharing, Healthy habits"
                    state={themeState}
                    errorMessage="A short theme helps us start the story."
                  />
                )}
              </div>
              <div>
                <FieldLabel tooltip="Adds context to the story (optional)" optional>
                  Occasion
                </FieldLabel>
                <TextInput
                  value={form.occasion}
                  onChange={(e) => set("occasion", e.target.value)}
                  placeholder="e.g. Birthday, First day of school, Diwali, Making a new friend"
                />
              </div>
            </Section>

            <button
              onClick={submit}
              disabled={submitting || !profileId}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow transition-opacity disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {submitting ? "Creating…" : `Create a story for ${childName} ✨`}
            </button>
          </>
        )}
      </main>
      <FloatingMiniPlayer />
      <AlertDialog open={showIdentityConfirm} onOpenChange={setShowIdentityConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update {childName}'s profile?</AlertDialogTitle>
            <AlertDialogDescription>
              You've changed the name, age, or gender. Save to profile or use for this story only?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowIdentityConfirm(false);
                void proceedWithSubmit(false);
              }}
            >
              This story only
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowIdentityConfirm(false);
                void proceedWithSubmit(true);
              }}
            >
              Update profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PhoneShell>
  );
};

export default PersonalisedStoryForm;
