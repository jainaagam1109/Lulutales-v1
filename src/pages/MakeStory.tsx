import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Headphones, BookOpen, Check, PenLine } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { MakeStoryCard } from "@/components/MakeStoryCard";
import { ParentCheck, parentCheckPassed } from "@/components/ParentCheck";
import {
  FamilyMembersEditor,
  type FamilyRow,
  parseFamilyRows,
  serializeFamilyRows,
  isFamilyRowComplete,
  convertLegacyFamily,
  DEFAULT_FAMILY_ROWS,
} from "@/components/StoryFormFields";
import { supabase } from "@/integrations/supabase/client";
import { createPersonalisedStory } from "@/lib/stories";
import { getThemeOptions, resolveBucket, BUCKETS, type BucketKey } from "@/lib/themeCatalog";
import { useFamily } from "@/lib/family";
import { trackEvent } from "@/lib/events";
import { track } from "@/lib/track";

type Theme = { label: string; value: string; skill: BucketKey };
type Format = "personalised_audio" | "bedtime_text";

const hindiOk = (age: number | null) => age != null && age >= 2 && age <= 6;

/** Themes for this age, from the database (so the team can change them), with the built-in list as a fallback. */
const useThemes = (age: number | null) =>
  useQuery({
    queryKey: ["story-themes", "feelings", age],
    enabled: age != null,
    queryFn: async (): Promise<Theme[]> => {
      const { data, error } = await (supabase as any)
        .from("story_themes")
        .select("label, value, skill_key, min_age, max_age, sort_order")
        .eq("type_key", "feelings")
        .eq("is_active", true)
        .lte("min_age", age)
        .gte("max_age", age)
        .order("sort_order", { ascending: true });
      const rows = (data ?? []) as any[];
      if (error || rows.length === 0) {
        return getThemeOptions(age!).map((t) => ({ label: t.label, value: t.value, skill: t.bucket }));
      }
      return rows.map((r) => ({ label: r.label, value: r.value, skill: (r.skill_key ?? resolveBucket(r.value)) as BucketKey }));
    },
  });

/** Card-style radio option. */
const Option = ({
  on,
  onClick,
  icon,
  title,
  desc,
}: {
  on: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  title: string;
  desc?: string;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={on}
    onClick={onClick}
    className={`flex w-full items-start gap-3 rounded-[18px] border-2 bg-card p-4 text-left transition-colors ${
      on ? "border-primary" : "border-border hover:border-primary/40"
    }`}
  >
    {icon && (
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        {icon}
      </span>
    )}
    <span className="min-w-0 flex-1">
      <span className="block font-semibold text-foreground">{title}</span>
      {desc && <span className="mt-0.5 block text-sm text-muted-foreground">{desc}</span>}
    </span>
    <span className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-primary bg-primary" : "border-border"}`}>
      {on && <Check className="h-3 w-3 text-primary-foreground" />}
    </span>
  </button>
);

const Segmented = <T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
  label: string;
}) => (
  <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-full bg-muted p-1">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={value === o.value}
        disabled={o.disabled}
        onClick={() => onChange(o.value)}
        className={`min-h-11 flex-1 rounded-full px-3 text-[15px] font-semibold transition-colors disabled:opacity-40 ${
          value === o.value ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Label = ({ children, optional }: { children: React.ReactNode; optional?: boolean }) => (
  <div className="mb-2 flex items-baseline gap-2">
    <span className="font-semibold text-foreground">{children}</span>
    {optional && <span className="text-xs text-muted-foreground">Optional</span>}
  </div>
);

const inputCls =
  "h-12 w-full rounded-2xl border border-border bg-card px-4 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none";

const MakeStory = () => {
  const nav = useNavigate();
  const location = useLocation();
  const fam = useFamily();
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;
  const params = new URLSearchParams(location.search);

  const [checked, setChecked] = useState(parentCheckPassed());
  const [step, setStep] = useState(1);

  // ---- the child's saved details ----
  const { data: profile, isLoading } = useQuery({
    queryKey: ["make-profile", profileId],
    enabled: !!profileId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("child_profiles")
        .select("name, age, gender, family_type, city, personality, home_type, family_members, family_address_terms, sibling_age, companion, favourite_place, last_occasion")
        .eq("id", profileId)
        .maybeSingle();
      return data as Record<string, any> | null;
    },
  });

  useEffect(() => {
    if (!profileId) nav(`/onboarding?next=${encodeURIComponent("/magic-hub")}`, { replace: true });
  }, [profileId, nav]);

  const name: string = profile?.name ?? localStorage.getItem("lulutales_child_name") ?? "your child";
  const age: number | null = profile?.age ?? (Number(localStorage.getItem("lulutales_child_age")) || null);
  const { data: themes = [] } = useThemes(age);

  // ---- choices ----
  const [theme, setTheme] = useState<Theme | null>(null);
  const [ownMode, setOwnMode] = useState(false);
  const [ownText, setOwnText] = useState("");
  const [occasion, setOccasion] = useState("");
  const [format, setFormat] = useState<Format>(params.get("format") === "read" ? "bedtime_text" : "personalised_audio");
  const [language, setLanguage] = useState<"english" | "hindi">("english");
  const [episodes, setEpisodes] = useState<"single" | "multi">("single");
  const [rows, setRows] = useState<FamilyRow[]>([]);
  const [city, setCity] = useState("");
  const [editFamily, setEditFamily] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fill family names and city from the profile once it arrives.
  const savedRows = useMemo(() => {
    if (!profile) return [];
    let r = parseFamilyRows(profile.family_address_terms ?? "");
    if (r.length === 0) r = convertLegacyFamily(profile.family_members, profile.sibling_age);
    return r;
  }, [profile]);
  const firstTime = !!profile && (savedRows.length === 0 || !(profile.city ?? "").trim());
  const filled = useRef(false);
  useEffect(() => {
    if (!profile || filled.current) return;
    filled.current = true;
    setRows(savedRows.length ? savedRows : DEFAULT_FAMILY_ROWS.map((r) => ({ ...r })));
    setCity(profile.city ?? "");
    setOccasion("");
  }, [profile, savedRows]);

  useEffect(() => {
    if (!hindiOk(age) && language === "hindi") setLanguage("english");
  }, [age, language]);

  const themeValue = ownMode ? ownText.trim() : theme?.value ?? "";
  const themeLabel = ownMode ? ownText.trim() : theme?.label ?? "";
  const skill: BucketKey | null = themeValue ? (ownMode ? resolveBucket(themeValue) : theme!.skill) : null;
  const showFamilyEditor = firstTime || editFamily;
  const familyNames = rows.filter(isFamilyRowComplete).map((r) => r.term.trim());
  const familyLine =
    familyNames.length <= 1 ? familyNames[0] ?? "" : `${familyNames.slice(0, -1).join(", ")} and ${familyNames[familyNames.length - 1]}`;
  const outOfStories = !fam.noLimit && fam.remaining <= 0;

  // ---------- submit ----------
  const make = async () => {
    if (!profileId || !profile || submitting) return;
    if (!themeValue) return setStep(1);
    if (!rows.some(isFamilyRowComplete)) {
      toast.error("Add at least one person so the story sounds like home.");
      return;
    }
    if (!city.trim()) {
      toast.error("Which city is home?");
      return;
    }
    setSubmitting(true);
    const family_address_terms = serializeFamilyRows(rows);
    const lang = hindiOk(age) ? language : "english";
    try {
      const created = await createPersonalisedStory({
        title: `${name}'s ${themeLabel} Story`,
        theme: themeValue,
        description: null,
        story_type: format,
        age_group: age != null ? String(age) : null,
        child_profile_id: profileId,
        episode_mode: format === "personalised_audio" ? episodes : "single",
        // Same details the story engine has always received.
        generation_params: {
          name,
          age: age != null ? String(age) : "",
          gender: profile.gender ?? "",
          family_type: profile.family_type ?? "",
          family_structure: profile.family_type ?? "",
          city: city.trim(),
          personality: profile.personality ?? "",
          home_type: profile.home_type ?? "",
          family_address_terms,
          favourite_place: profile.favourite_place ?? null,
          theme: themeValue,
          occasion: occasion.trim() || null,
          language: lang,
        },
      });
      trackEvent("story_requested", {
        story_type: format,
        theme: themeValue,
        occasion: occasion.trim() || null,
        language: lang,
        age_group: age != null ? String(age) : null,
      });
      void track("story_requested", { story_id: created.id, story_type: format });
      const { error } = await (supabase as any)
        .from("child_profiles")
        .update({ last_theme: themeValue, last_occasion: occasion.trim() || null, city: city.trim(), family_address_terms })
        .eq("id", profileId);
      if (error) console.error("[MakeStory] profile update failed", error);
      nav(`/generating/${created.id}`, { replace: true });
    } catch (e) {
      console.error("[MakeStory] save failed", e);
      toast.error("We couldn’t start the story. Please try again.");
      setSubmitting(false);
    }
  };

  const back = () => (step > 1 ? setStep(step - 1) : nav(-1));
  const canNext = step === 1 ? !!themeValue : true;

  // ---------- gates ----------
  if (!checked) {
    return (
      <PhoneShell>
        <div className="flex-1" />
        <ParentCheck onPass={() => setChecked(true)} onCancel={() => nav(-1)} />
      </PhoneShell>
    );
  }

  if (fam.loading || isLoading) {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>
      </PhoneShell>
    );
  }

  if (fam.status !== "approved" || outOfStories) {
    return (
      <PhoneShell>
        <header className="px-5 pt-4">
          <button onClick={() => nav("/")} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-foreground">
            <ChevronLeft className="h-4 w-4" /> Home
          </button>
        </header>
        <main className="px-5 pt-4">
          <MakeStoryCard childName={profile?.name ?? null} hasChild />
        </main>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <header className="px-5 pt-3 md:pt-8">
        <div className="flex items-center justify-between">
          <button onClick={back} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-foreground">
            <ChevronLeft className="h-4 w-4" /> {step > 1 ? "Back" : "Cancel"}
          </button>
          <span className="text-sm font-semibold text-muted-foreground">Step {step} of 3</span>
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-6 pt-5">
        {/* ---------- Step 1: the moment ---------- */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="font-[Quicksand] text-[26px] font-bold leading-tight text-foreground">What’s this story about?</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Pick a moment {name} is facing, or write your own.{age != null ? ` These are chosen for age ${age}.` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => {
                const on = !ownMode && theme?.value === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setOwnMode(false);
                      setTheme(t);
                    }}
                    className={`min-h-11 rounded-full border px-4 text-[15px] font-semibold transition-colors ${
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/40"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={ownMode}
                onClick={() => setOwnMode(true)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed px-4 text-[15px] font-semibold ${
                  ownMode ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"
                }`}
              >
                <PenLine className="h-4 w-4" /> Write my own
              </button>
            </div>
            {ownMode && (
              <div>
                <Label>In a few words</Label>
                <input
                  autoFocus
                  value={ownText}
                  onChange={(e) => setOwnText(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. scared of the dark, new baby brother"
                  className={inputCls}
                />
              </div>
            )}
            {skill && BUCKETS[skill] && (
              <div className="rounded-[18px] bg-accent p-4">
                <div className="font-semibold text-foreground">Builds {BUCKETS[skill].cardName.toLowerCase()}.</div>
                <p className="mt-0.5 text-sm text-foreground/75">{BUCKETS[skill].definition}</p>
              </div>
            )}
            <div>
              <Label optional>Anything special coming up?</Label>
              <input
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                maxLength={80}
                placeholder="e.g. first day of school, Diwali"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* ---------- Step 2: how ---------- */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="font-[Quicksand] text-[26px] font-bold leading-tight text-foreground">How should {name} get it?</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">You can change this for every story.</p>
            </div>
            <div role="radiogroup" aria-label="Format" className="flex flex-col gap-2.5">
              <Option
                on={format === "personalised_audio"}
                onClick={() => setFormat("personalised_audio")}
                icon={<Headphones className="h-5 w-5" />}
                title="Listen"
                desc="A warm voice tells it. No screen needed. About 6 minutes."
              />
              <Option
                on={format === "bedtime_text"}
                onClick={() => setFormat("bedtime_text")}
                icon={<BookOpen className="h-5 w-5" />}
                title="Read"
                desc="You read it aloud from the screen. About 4 minutes."
              />
            </div>
            <div>
              <Label>Language</Label>
              <Segmented
                label="Language"
                value={language}
                onChange={(v) => setLanguage(v as "english" | "hindi")}
                options={[
                  { value: "english", label: "English" },
                  { value: "hindi", label: "हिंदी", disabled: !hindiOk(age) },
                ]}
              />
              {!hindiOk(age) && <p className="mt-1.5 text-xs text-muted-foreground">Hindi is for ages 2 to 6.</p>}
            </div>
            {format === "personalised_audio" && (
              <div>
                <Label>One story or short episodes?</Label>
                <Segmented
                  label="Episodes"
                  value={episodes}
                  onChange={(v) => setEpisodes(v as "single" | "multi")}
                  options={[
                    { value: "single", label: "One story" },
                    { value: "multi", label: "Short episodes" },
                  ]}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Short episodes help little ones stay with a longer story.</p>
              </div>
            )}
          </div>
        )}

        {/* ---------- Step 3: check (or family, the first time) ---------- */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="font-[Quicksand] text-[26px] font-bold leading-tight text-foreground">
                {firstTime ? `Who’s in ${name}’s world?` : `Ready to make ${name}’s story?`}
              </h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {firstTime ? "Just once. We use these names so the story sounds like home." : "A quick look before we start."}
              </p>
            </div>

            {!firstTime && (
              <dl className="divide-y divide-border rounded-[18px] border border-border bg-card">
                {[
                  { k: "The moment", v: `${themeLabel}${skill && BUCKETS[skill].cardName.toLowerCase() !== themeLabel.toLowerCase() ? ` · builds ${BUCKETS[skill].cardName.toLowerCase()}` : ""}`, go: () => setStep(1) },
                  {
                    k: "How",
                    v: `${format === "personalised_audio" ? "Listen" : "Read"} · ${language === "hindi" ? "हिंदी" : "English"}${
                      format === "personalised_audio" ? ` · ${episodes === "multi" ? "Short episodes" : "One story"}` : ""
                    }`,
                    go: () => setStep(2),
                  },
                  { k: "Starring", v: `${name}${age != null ? `, ${age}` : ""}${city ? ` · ${city}` : ""}`, go: () => nav("/profiles") },
                  { k: "Family in the story", v: familyLine || "Add family names", go: () => setEditFamily((x) => !x) },
                ].map((r) => (
                  <div key={r.k} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{r.k}</dt>
                      <dd className="mt-0.5 text-[15px] text-foreground">{r.v}</dd>
                    </div>
                    <button type="button" onClick={r.go} className="min-h-10 shrink-0 px-1 text-sm font-semibold text-primary">
                      Edit
                    </button>
                  </div>
                ))}
              </dl>
            )}

            {showFamilyEditor && (
              <div className="flex flex-col gap-4">
                <div>
                  <Label>Who, and what {name} calls them</Label>
                  <FamilyMembersEditor value={rows} onChange={setRows} />
                </div>
                <div>
                  <Label>Your city</Label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="e.g. Bengaluru" className={inputCls} />
                  <p className="mt-1.5 text-xs text-muted-foreground">Saved to {name}’s profile. You can change it any time in Parents.</p>
                </div>
              </div>
            )}

            {!firstTime && (
              <p className="rounded-[18px] bg-secondary p-4 text-sm text-foreground/80">
                We write it, run our 12 checks, then {format === "personalised_audio" ? "record it" : "get it ready to read"}. It takes about 5 minutes.
              </p>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-background px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        {step === 3 && !fam.noLimit && (
          <p className="mb-2 text-center text-sm text-muted-foreground">
            Uses 1 of your family’s <strong className="font-semibold text-foreground">{fam.remaining} stories left</strong> this month.
          </p>
        )}
        {step < 3 ? (
          <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="w-full bg-primary text-primary-foreground disabled:opacity-50">
            Next
          </button>
        ) : (
          <button type="button" disabled={submitting} onClick={make} className="w-full bg-primary text-primary-foreground disabled:opacity-60">
            {submitting ? "Starting…" : `Make ${name}’s story`}
          </button>
        )}
      </footer>
    </PhoneShell>
  );
};

export default MakeStory;
