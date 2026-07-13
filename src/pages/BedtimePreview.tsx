import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { fetchStory } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { PageHeader } from "@/components/PageHeader";
import { TagChip } from "@/components/TagChip";
import { parseBedtimeStory } from "@/lib/parseBedtimeStory";
import { getThemeVisual } from "@/lib/themeEmoji";

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

  useEffect(() => {
    if (!story) return;
    if (story.is_generated) return;
    nav(`/generating/${story.id}`, { replace: true });
  }, [story, nav]);

  const parsed = parseBedtimeStory(story?.story_text);
  const displayTitle = parsed.title ?? story?.title ?? "Bedtime story";
  const emoji = story?.thumbnail ?? getThemeVisual(story?.theme).emoji;

  return (
    <PhoneShell>
      <PageHeader backTo={backTo}>
        <div className="flex h-44 items-center justify-center rounded-3xl bg-gradient-card text-7xl shadow-soft">
          {emoji}
        </div>
      </PageHeader>

      <main className="flex flex-1 flex-col overflow-y-auto px-5 pb-6">
        {story?.theme && <TagChip label={story.theme} />}
        <h1 className="mt-2 text-2xl font-extrabold text-foreground">{displayTitle}</h1>

        <h2 className="mt-6 text-[11px] font-semibold text-muted-foreground">
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
