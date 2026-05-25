import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Sun, Moon } from "lucide-react";
import { fetchStory } from "@/lib/stories";
import { parseBedtimeStory } from "@/lib/parseBedtimeStory";
import { supabase } from "@/integrations/supabase/client";

const SIZES = [16, 18, 20];

const BedtimeReader = () => {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: story } = useQuery({ queryKey: ["story", id], queryFn: () => fetchStory(id) });

  const [sizeIdx, setSizeIdx] = useState(1);
  const [dark, setDark] = useState(false);
  const hasRecordedRef = useRef(false);

  useEffect(() => {
    if (hasRecordedRef.current || !story?.id) return;
    const profileId = localStorage.getItem("lulutales_profile_id");
    if (!profileId) {
      console.warn("[analytics] bedtime skipped: no profileId in localStorage");
      return;
    }
    hasRecordedRef.current = true;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      console.log("[analytics] bedtime attempt", { profileId, storyId: story.id, authUid: userData?.user?.id ?? null });
      const { error } = await supabase.from("story_analytics").insert({
        profile_id: profileId,
        story_id: story.id,
        episode_id: null,
        event_type: "play",
        position_seconds: 0,
      });
      if (error) console.warn("[analytics] bedtime insert failed", error);
      else console.log("[analytics] bedtime insert ok");
    })();
  }, [story?.id]);

  const fontSize = SIZES[sizeIdx];
  const { prose } = parseBedtimeStory(story?.story_text);

  const bg = dark ? "#0F1923" : "#FFFFFF";
  const fg = dark ? "#F5F0E8" : "#1A1612";
  const subtle = dark ? "rgba(245,240,232,0.7)" : "rgba(26,22,18,0.6)";
  const border = dark ? "rgba(245,240,232,0.18)" : "rgba(26,22,18,0.12)";

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: bg, color: fg }}>
      <button
        onClick={() => nav(`/bedtime/${id}`)}
        className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ color: fg, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <main
        className="flex-1 overflow-y-auto"
        style={{ padding: "72px 24px 120px" }}
      >
        {prose ? (
          <article
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.8,
              color: fg,
              whiteSpace: "pre-wrap",
              maxWidth: "640px",
              margin: "0 auto",
            }}
          >
            {prose}
          </article>
        ) : (
          <p className="mx-auto max-w-md pt-10 text-center text-sm" style={{ color: subtle }}>
            {story ? "This bedtime story has no text yet." : "Loading…"}
          </p>
        )}
      </main>

      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between px-5 py-3"
        style={{ background: bg, borderTop: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSizeIdx((i) => Math.max(0, i - 1))}
            disabled={sizeIdx === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold disabled:opacity-40"
            style={{ border: `1px solid ${border}`, color: fg }}
            aria-label="Decrease font size"
          >
            A−
          </button>
          <button
            onClick={() => setSizeIdx((i) => Math.min(SIZES.length - 1, i + 1))}
            disabled={sizeIdx === SIZES.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold disabled:opacity-40"
            style={{ border: `1px solid ${border}`, color: fg }}
            aria-label="Increase font size"
          >
            A+
          </button>
        </div>
        <button
          onClick={() => setDark((d) => !d)}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ border: `1px solid ${border}`, color: fg }}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};

export default BedtimeReader;
