import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Sun, Moon } from "lucide-react";
import { fetchStory } from "@/lib/stories";
import { parseBedtimeStory } from "@/lib/parseBedtimeStory";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/track";
import { skillKeyFor } from "@/components/SkillPicture";
import { SKILL_ART } from "@/lib/skillArt";

const SIZES = [17, 19, 22];

const BedtimeReader = () => {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: story } = useQuery({ queryKey: ["story", id], queryFn: () => fetchStory(id) });

  const [sizeIdx, setSizeIdx] = useState(1);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!story) return;
    if (story.is_generated) return;
    nav(`/generating/${story.id}`, { replace: true });
  }, [story, nav]);
  useEffect(() => {
    if (!story?.id) return;

    const mountTime = Date.now();
    let heardFlag = false;
    let logged = false;

    const timer = setTimeout(() => { heardFlag = true; }, 30 * 1000);

    return () => {
      clearTimeout(timer);
      if (!heardFlag || logged) return;
      logged = true;

      void (async () => {
        const sessionKey = `lulutales_session_${story.id}`;
        const last = localStorage.getItem(sessionKey);
        if (last && Date.now() - parseInt(last) < 30 * 60 * 1000) return;
        localStorage.setItem(sessionKey, String(Date.now()));

        let profileId = localStorage.getItem("lulutales_profile_id");
        if (!profileId) {
          const { data: auth } = await supabase.auth.getUser();
          const uid = auth.user?.id;
          if (!uid) return;
          const { data: kids } = await supabase
            .from("child_profiles")
            .select("id")
            .eq("user_id", uid)
            .order("created_at", { ascending: true })
            .limit(1);
          profileId = kids?.[0]?.id ?? null;
          if (!profileId) return;
          localStorage.setItem("lulutales_profile_id", profileId);
        }

        const durationSeconds = Math.floor((Date.now() - mountTime) / 1000);

        void supabase.from("story_analytics").insert({
          profile_id: profileId,
          story_id: story.id,
          episode_id: null,
          event_type: "complete",
          source: "bedtime",
          session_id: getSessionId(),
          position_seconds: 0,
          duration_seconds: durationSeconds,
        } as any).then(() => {});
      })();
    };
  }, [story?.id]);

  const fontSize = SIZES[sizeIdx];
  const { prose } = parseBedtimeStory(story?.story_text);
  const paragraphs = (prose ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const skill = story ? skillKeyFor(story as any) : "B1";

  return (
    <div className={dark ? "dark" : ""}>
      <div className="fixed inset-0 flex flex-col bg-background text-foreground">
        <header className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => nav(`/story/${id}`)}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Back to the story"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-muted-foreground">Read aloud · {SKILL_ART[skill]?.name}</div>
            <div className="truncate font-[Quicksand] text-[17px] font-bold">{story?.title ?? ""}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-32 pt-8">
          {paragraphs.length ? (
            <article className="mx-auto max-w-[620px]" style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
              {paragraphs.map((p, i) => (
                <p key={i} className="mb-5 !text-foreground">
                  {p}
                </p>
              ))}
              <p className="mt-10 text-center font-[Quicksand] text-lg font-bold !text-muted-foreground">The end</p>
            </article>
          ) : (
            <p className="mx-auto max-w-md pt-10 text-center text-sm text-muted-foreground">
              {story ? "This story doesn’t have any text yet." : "Loading…"}
            </p>
          )}
        </main>

        <footer className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-border bg-background px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSizeIdx((i) => Math.max(0, i - 1))}
              disabled={sizeIdx === 0}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-sm font-bold disabled:opacity-40"
              aria-label="Smaller text"
            >
              A−
            </button>
            <button
              type="button"
              onClick={() => setSizeIdx((i) => Math.min(SIZES.length - 1, i + 1))}
              disabled={sizeIdx === SIZES.length - 1}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-base font-bold disabled:opacity-40"
              aria-label="Bigger text"
            >
              A+
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border"
            aria-label={dark ? "Light page" : "Dark page for bedtime"}
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BedtimeReader;
