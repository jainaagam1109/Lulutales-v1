import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Play } from "lucide-react";
import { Headphones } from "lucide-react";
import { fetchStory, type Story } from "@/lib/stories";

export const MiniPlayer = () => {
  const [story, setStory] = useState<Story | null>(null);
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const id = localStorage.getItem("lulutales_last_story");
    const completed = localStorage.getItem("lulutales_last_story_completed") === "1";
    if (!id || completed) {
      setStory(null);
      return;
    }
    const p = parseInt(localStorage.getItem("lulutales_last_story_progress") ?? "0", 10);
    setProgress(isFinite(p) ? p : 0);
    fetchStory(id).then(setStory).catch(() => setStory(null));
  }, [location.pathname]);

  if (!story) return null;
  if (story.story_type === "bedtime_text") return null;
  if (location.pathname.startsWith("/player/")) return null;
  // Hide on Home — the dashboard already surfaces the ongoing story prominently
  if (location.pathname === "/") return null;
  // Hide on Magic Hub — the page renders its own promoted player strip
  if (location.pathname === "/magic-hub") return null;

  return (
    <Link
      to={`/player/${story.id}`}
      className="mx-3 mb-2 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-2 pr-3 shadow-soft backdrop-blur-md"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-card text-primary-deep">
        <Headphones className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-foreground">{story.title}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          Continue listening · {progress}% complete · tap to resume
        </div>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
        <Play className="h-4 w-4 fill-current" />
      </div>
    </Link>
  );
};
