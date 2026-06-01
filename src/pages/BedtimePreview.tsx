import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { fetchStory } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { TagChip } from "@/components/TagChip";
import { parseBedtimeStory } from "@/lib/parseBedtimeStory";

const themeEmoji = (theme: string | null | undefined) => {
  if (!theme) return "🌙";
  const t = theme.toLowerCase();
  if (t.includes("space") || t.includes("star")) return "🌌";
  if (t.includes("ocean") || t.includes("sea")) return "🌊";
  if (t.includes("forest") || t.includes("nature")) return "🌳";
  if (t.includes("dragon") || t.includes("magic")) return "🐉";
  if (t.includes("animal")) return "🦊";
  if (t.includes("dream")) return "💭";
  return "🌙";
};

const BedtimePreview = () => {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from === "/happy-place" ? "/happy-place" : "/";

  const { data: story, isLoading } = useQuery({
    queryKey: ["story", id],
    queryFn: () => fetchStory(id),
  });

  const parsed = parseBedtimeStory(story?.story_text);
  const displayTitle = parsed.title ?? story?.title ?? "Bedtime story";
  const emoji = story?.thumbnail ?? themeEmoji(story?.theme);

  return (
    <PhoneShell>
      <div className="px-5 pt-4 pb-3">
        <button
          onClick={() => nav(backTo)}
          className="mb-3 flex items-center gap-1 text-xs text-primary-deep"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex h-44 items-center justify-center rounded-3xl bg-gradient-card text-7xl shadow-soft">
          {emoji}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-6">
        {story?.theme && <TagChip label={story.theme} />}
        <h1 className="mt-2 text-2xl font-extrabold text-foreground">{displayTitle}</h1>

        <h2 className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Summary
        </h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : parsed.summary ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
            {parsed.summary}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No summary available.</p>
        )}

        <div className="mt-auto pt-6">
          <button
            onClick={() => nav(`/bedtime/${id}/read`, { state: { from: location.pathname } })}
            disabled={!parsed.prose}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            Read the story <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </PhoneShell>
  );
};

export default BedtimePreview;
