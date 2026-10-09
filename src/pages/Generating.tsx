import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { SkillPicture, skillKeyFor } from "@/components/SkillPicture";
import { getStoryStatus } from "@/lib/storyStatus";
import { createPersonalisedStory } from "@/lib/stories";
import { useFamily } from "@/lib/family";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const SLOW_MS = 12 * 60 * 1000;
const POLL_MS = 15000;

/** "Being made" screen: shows progress, then opens the story, or explains if it couldn't be made. */
const Generating = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const nav = useNavigate();
  const fam = useFamily();
  const [story, setStory] = useState<Tables<"stories"> | null>(null);
  const [now, setNow] = useState(Date.now());
  const [retrying, setRetrying] = useState(false);
  const doneRef = useRef(false);
  const childName =
    ((story?.generation_params as any)?.name as string | undefined) ||
    (typeof window !== "undefined" ? localStorage.getItem("lulutales_child_name") : null) ||
    "your child";

  useEffect(() => {
    if (!storyId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("stories").select("*").eq("id", storyId).maybeSingle();
      if (cancelled || !data) return;
      setStory(data);
      setNow(Date.now());
      if (data.is_generated && !doneRef.current) {
        doneRef.current = true;
        const dest = data.story_type === "bedtime_text" ? `/bedtime/${storyId}` : `/story/${storyId}`;
        setTimeout(() => nav(dest, { replace: true }), 1800);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(tick);
    };
  }, [storyId, nav]);

  const status = story ? getStoryStatus(story) : "preparing";
  const failed = status === "stale" || status === "lang_age_failed";
  const ready = !!story?.is_generated;
  const elapsed = story ? now - new Date(story.created_at).getTime() : 0;
  const slow = !ready && !failed && elapsed > SLOW_MS;
  const isAudio = story?.story_type !== "bedtime_text";
  const skill = story ? skillKeyFor(story as any) : "B7a";
  const theme = (story?.theme ?? "").trim();
  const themeNice = theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "Your story";

  // Our best guess at where the story is, from how long it has been going.
  const stage = ready ? 4 : elapsed < 90_000 ? 1 : elapsed < 200_000 ? 2 : 3;
  const steps = [
    { title: stage > 1 || ready ? "Story written" : "Writing the story", sub: `${themeNice}, starring ${childName}` },
    { title: "Running our 12 checks", sub: "Right for their age, safe, uses your family’s names" },
    isAudio ? { title: "Recording the voice", sub: "A warm narrator reads it aloud" } : { title: "Setting it out to read", sub: "Big, clear text for bedtime" },
    { title: isAudio ? "Ready to play" : "Ready to read", sub: "" },
  ];

  const tryAgain = async () => {
    if (!story || retrying) return;
    setRetrying(true);
    try {
      const created = await createPersonalisedStory({
        title: story.title ?? "Your story",
        theme: story.theme,
        description: null,
        story_type: story.story_type as "personalised_audio" | "bedtime_text",
        age_group: story.age_group,
        child_profile_id: story.child_profile_id!,
        episode_mode: ((story as any).episode_mode ?? "single") as "single" | "multi",
        generation_params: story.generation_params,
      });
      doneRef.current = false;
      nav(`/generating/${created.id}`, { replace: true });
    } catch {
      toast.error("We couldn’t start it again. Please try in a moment.");
    } finally {
      setRetrying(false);
    }
  };

  // ---------- couldn't be made ----------
  if (failed) {
    return (
      <PhoneShell>
        <main className="flex flex-1 flex-col justify-center px-6 py-10">
          <div className="mx-auto mb-6 h-36 w-full max-w-[300px] overflow-hidden rounded-[22px] opacity-60 grayscale-[40%]">
            <SkillPicture skill={skill} />
          </div>
          <h1 className="font-[Quicksand] text-[26px] font-bold leading-tight text-foreground">We couldn’t make this one.</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Something in the story didn’t pass our checks, so we stopped it before {childName} heard it.
          </p>
          <p className="mt-3 rounded-[18px] bg-accent p-4 text-[15px] text-foreground">
            It hasn’t used one of your stories.
            {!fam.noLimit && !fam.loading && (
              <>
                {" "}Your family still has <strong className="font-semibold">{Math.max(0, fam.remaining)} left</strong>.
              </>
            )}
          </p>
          <button type="button" onClick={tryAgain} disabled={retrying} className="mt-6 w-full bg-primary text-primary-foreground disabled:opacity-60">
            {retrying ? "Starting…" : "Try again"}
          </button>
          <Link to="/magic-hub" replace className="mt-2 flex min-h-12 items-center justify-center text-[15px] font-semibold text-primary">
            Pick a different moment
          </Link>
        </main>
      </PhoneShell>
    );
  }

  // ---------- being made / ready ----------
  return (
    <PhoneShell>
      <main className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
        <div className="relative mx-auto mb-6 h-40 w-full max-w-[320px] overflow-hidden rounded-[24px]">
          <SkillPicture skill={skill} />
          {!ready && <span className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-primary" />}
        </div>
        <h1 className="font-[Quicksand] text-[26px] font-bold leading-tight text-foreground">
          {ready ? `${childName}’s story is ready` : `Writing ${childName}’s story`}
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {ready
            ? "Opening it now…"
            : slow
              ? "This one is taking longer than usual. You can leave this screen. It’ll be waiting in My stories."
              : "About 5 minutes. You can leave this screen. It’ll be waiting in My stories."}
        </p>

        <ol className="mt-6 flex flex-col gap-4" aria-label="Progress">
          {steps.map((s, i) => {
            const n = i + 1;
            const done = n < stage || ready;
            const current = n === stage && !ready;
            return (
              <li key={s.title} className="flex gap-3" aria-current={current ? "step" : undefined}>
                <span
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                    done ? "bg-primary text-primary-foreground" : current ? "border-2 border-primary" : "border-2 border-border"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> : null}
                </span>
                <div>
                  <div className={`font-semibold ${done || current ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</div>
                  {s.sub && (done || current) && <div className="text-sm text-muted-foreground">{s.sub}</div>}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-auto flex flex-col gap-2 pt-8">
          <Link to="/library" className="lt-card flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-5 text-[15px] font-semibold text-foreground">
            Listen to a library story while you wait
          </Link>
          <Link to="/" className="flex min-h-12 items-center justify-center text-[15px] font-semibold text-primary">
            Go to Home
          </Link>
        </div>
      </main>
    </PhoneShell>
  );
};

export default Generating;
