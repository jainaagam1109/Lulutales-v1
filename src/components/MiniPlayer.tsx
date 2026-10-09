import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Play } from "lucide-react";
import { SkillPicture, skillKeyFor } from "./SkillPicture";
import { fetchStory, fetchEpisodes, type Story } from "@/lib/stories";
import {
  getActiveProfileId,
  getLastStoryId,
  getLastEpisode,
  getStoryPct,
} from "@/lib/lastStory";
import { useResumeProgress } from "@/hooks/useResumeProgress";

export const MiniPlayer = () => {
  const [story, setStory] = useState<Story | null>(null);
  const [pct, setPct] = useState(0);
  const [ep, setEp] = useState(1);
  const [tick, setTick] = useState(0);
  const location = useLocation();

  const pid = getActiveProfileId();
  const { data: serverRow } = useResumeProgress(pid);

  // Re-read on route change AND on storage events (profile switch in another tab/route).
  useEffect(() => {
    const onStorage = () => setTick((n) => n + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!pid) {
      setStory(null);
      return;
    }
    // Server row wins for story+ep+pct when available; otherwise fall back to local.
    const localId = getLastStoryId(pid);
    const id =
      serverRow && !serverRow.completed ? serverRow.story_id : localId;
    if (!id) {
      setStory(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const s = await fetchStory(id).catch(() => null);
      if (cancelled) return;
      // Only audio stories belong in continue-listening.
      if (!s || s.story_type === "bedtime_text") {
        setStory(null);
        return;
      }
      // Episode + percent: prefer server when it matches the same story.
      let resolvedEp = getLastEpisode(pid, id);
      let storyPct = getStoryPct(pid, id);
      if (serverRow && !serverRow.completed && serverRow.story_id === id) {
        resolvedEp = serverRow.episode_number ?? resolvedEp;
        if (serverRow.percent > storyPct) storyPct = serverRow.percent;
      }
      if (!storyPct) {
        const eps = await fetchEpisodes(id).catch(() => []);
        const total = eps.length || 1;
        const lastEp = Math.min(resolvedEp, total);
        storyPct = Math.floor(((lastEp - 1) / total) * 100);
      }
      setStory(s);
      setEp(resolvedEp);
      setPct(storyPct);
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, tick, pid, serverRow]);

  if (!story) return null;
  if (location.pathname.startsWith("/player/")) return null;
  if (location.pathname.startsWith("/bedtime/")) return null;
  if (location.pathname.startsWith("/story/") || location.pathname.startsWith("/magic-hub") || location.pathname.startsWith("/generating")) return null;

  const safePct = Math.max(0, Math.min(100, pct));

  return (
    <Link
      to={`/player/${story.id}/${ep}`}
      aria-label={`Continue listening to ${story.title}`}
      className="mx-3 mb-2 flex items-center gap-3 overflow-hidden rounded-[18px] bg-[#1F1B3A] p-2 pr-2.5 text-white shadow-soft md:mx-0 md:mb-4"
    >
      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl">
        <SkillPicture skill={skillKeyFor(story as any)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{story.title}</div>
        <div className="truncate text-xs text-white/70">Continue listening{ep > 1 ? ` · Episode ${ep}` : ""}</div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-primary" style={{ width: `${safePct}%` }} />
        </div>
      </div>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Play className="ml-0.5 h-4 w-4 fill-current" />
      </div>
    </Link>
  );
};
