import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, Bookmark, BookmarkCheck, BookOpen } from "lucide-react";
import { fetchEpisodes, fetchStory, fetchStoryTags, isSaved, toggleSaved } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { PageHeader } from "@/components/PageHeader";
import { TagChip } from "@/components/TagChip";
import { StoryStatusCard } from "@/components/StoryStatusCard";
import { getStoryStatus } from "@/lib/storyStatus";
import { cleanEpisodeTitle } from "@/lib/episodeTitle";
import { trackEvent } from "@/lib/events";
import { toast } from "sonner";


const StoryDetail = () => {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from === "/happy-place" ? "/happy-place" : "/";
  const { data: story, isLoading } = useQuery({ queryKey: ["story", id], queryFn: () => fetchStory(id) });


  const { data: tags = [] } = useQuery({ queryKey: ["story-tags", id], queryFn: () => fetchStoryTags(id), enabled: !!id });
  const { data: episodes = [] } = useQuery({ queryKey: ["episodes", id], queryFn: () => fetchEpisodes(id), enabled: !!id });
  const [saved, setSaved] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);

  useEffect(() => {
    if (id) isSaved(id).then(setSaved);
  }, [id]);

  useEffect(() => {
    if (id) isSaved(id).then(setSaved);
  }, [id]);

  useEffect(() => {
    if (id) trackEvent("story_opened", { story_id: id });
  }, [id]);

  const onToggleSave = async () => {
    const next = await toggleSaved(id);
    setSaved(next);
    toast.success(next ? "Saved to library" : "Removed from library");
  };

  if (isLoading) return <PhoneShell><p className="p-6 text-sm text-muted-foreground">Loading…</p></PhoneShell>;
  if (!story) return <PhoneShell><p className="p-6 text-sm">Not found. <Link to="/" className="text-primary-deep">Go home</Link></p></PhoneShell>;

  return (
    <PhoneShell>
      <PageHeader backTo={backTo}>
        <div className="flex h-40 items-center justify-center rounded-3xl bg-gradient-card text-7xl shadow-soft">
          {story.thumbnail ?? "📖"}
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {story.theme && <TagChip label={story.theme} />}
        <h1 className="mt-2 text-2xl font-extrabold text-foreground">{story.title}</h1>
        {story.age_group && (
          <div className="mt-1 text-xs text-muted-foreground">
            Most appropriate for kids aged {story.age_group}
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <TagChip key={t} label={t} />
            ))}
          </div>
        )}

        {(() => {
          const summary = (story as any).parent_summary || story.description;
          if (!summary) return null;
          const canToggle = summary.length > 200;
          return (
            <div className="mt-4">
              <div className="mb-1 text-[10px] font-semibold text-muted-foreground">
                About this story
              </div>
              <p
                className={`text-sm leading-relaxed text-foreground/80 ${
                  !showFullSummary && canToggle ? "line-clamp-4" : ""
                }`}
              >
                {summary}
              </p>
              {canToggle && (
                <button
                  onClick={() => setShowFullSummary((v) => !v)}
                  className="mt-1 text-[11px] font-semibold text-primary-deep"
                >
                {showFullSummary ? "Show less" : "Read full story summary"}
                </button>
              )}
            </div>
          );
        })()}

        {getStoryStatus(story) === "ready" ? (
          <>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() =>
                  nav(story.story_type === "bedtime_text" ? `/bedtime/${story.id}` : `/player/${story.id}`)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow"
              >
                {story.story_type === "bedtime_text" ? (
                  <>
                    <BookOpen className="h-4 w-4" /> Read story
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" /> Play story
                  </>
                )}
              </button>
              <button
                onClick={onToggleSave}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-primary-deep"
                aria-label="Save"
              >
                {saved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
              </button>
            </div>

            {story.story_type !== "bedtime_text" && !(story as any).universe_id && (
              <>
                <h2 className="mt-7 mb-2 text-[11px] font-semibold text-muted-foreground">
                  Episodes
                </h2>
                <div className="rounded-2xl border border-border bg-card">
                  {episodes.length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No episodes yet.</div>
                  )}
                  {episodes.map((ep) => {
                    const sub = cleanEpisodeTitle(ep.title, story.title, ep.episode_number);
                    return (
                      <button
                        key={ep.id}
                        onClick={() => nav(`/player/${story.id}/${ep.episode_number}`)}
                        className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted-foreground">
                          {ep.episode_number}
                        </div>
                        <div className="flex-1 text-sm font-semibold text-foreground">
                          Episode {ep.episode_number}
                          {sub ? <span className="font-normal text-muted-foreground"> · {sub}</span> : null}
                        </div>
                        <Play className="h-4 w-4 fill-current text-primary-deep" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="mt-5">
            <StoryStatusCard story={story} variant="row" />
          </div>
        )}
      </div>
    </PhoneShell>
  );
};

export default StoryDetail;

