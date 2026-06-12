import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Play, Headphones } from "lucide-react";
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

  const safePct = Math.max(0, Math.min(100, pct));

  return (
    <Link
      to={`/player/${story.id}/${ep}`}
      className="mx-3 mb-2 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-2 pr-3 shadow-soft backdrop-blur-md"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-card text-primary-deep">
        <Headphones className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-foreground">{story.title}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          Continue listening · {safePct}% complete · tap to resume
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-gradient-primary"
            style={{ width: `${safePct}%` }}
          />
        </div>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
        <Play className="h-4 w-4 fill-current" />
      </div>
    </Link>
  );
};
