import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Play, Heart, BookOpen, Check } from "lucide-react";
import { toast } from "sonner";
import { fetchEpisodes, fetchStory, isSaved, toggleSaved, type Story } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { StoryStatusCard } from "@/components/StoryStatusCard";
import { SkillPicture, skillKeyFor } from "@/components/SkillPicture";
import { storyLanguage } from "@/components/StoryCard";
import { getStoryStatus } from "@/lib/storyStatus";
import { cleanEpisodeTitle } from "@/lib/episodeTitle";
import { trackEvent } from "@/lib/events";
import { BUCKETS, type BucketKey } from "@/lib/themeCatalog";
import { getActiveProfileId, getLastEpisode, getPosition, isEpisodeDone } from "@/lib/lastStory";

const mins = (secs: number | null | undefined) => (secs && secs > 0 ? Math.max(1, Math.round(secs / 60)) : null);

/** The skill line shown under "What this story builds": the story's own line if the team wrote one, else the skill's. */
const buildsFor = (story: Story) => {
  const key = skillKeyFor(story as any) as BucketKey;
  const b = BUCKETS[key];
  return { name: b?.cardName ?? "Courage", line: ((story as any).builds_line as string | null) || b?.definition || "" };
};

const StoryDetail = () => {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from && from.startsWith("/") ? from : "/";
  const backLabel = backTo === "/library" ? "Library" : backTo === "/my-stories" ? "My stories" : backTo.startsWith("/universe") ? "Story world" : "Home";

  const { data: story, isLoading } = useQuery({ queryKey: ["story", id], queryFn: () => fetchStory(id) });
  const { data: episodes = [] } = useQuery({ queryKey: ["episodes", id], queryFn: () => fetchEpisodes(id), enabled: !!id });
  const [saved, setSaved] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const pid = getActiveProfileId();
  const childName = typeof window !== "undefined" ? localStorage.getItem("lulutales_child_name") : null;

  useEffect(() => {
    if (!id) return;
    isSaved(id).then(setSaved);
    trackEvent("story_opened", { story_id: id });
  }, [id]);

  const onToggleSave = async () => {
    const next = await toggleSaved(id);
    setSaved(next);
    toast.success(next ? "Saved to My stories" : "Removed from My stories");
  };

  if (isLoading)
    return (
      <PhoneShell>
        <p className="p-6 text-sm text-muted-foreground">Loading…</p>
      </PhoneShell>
    );
  if (!story)
    return (
      <PhoneShell>
        <div className="p-6 text-[15px]">
          We couldn’t find this story.{" "}
          <Link to="/" className="font-semibold text-primary">
            Go to Home
          </Link>
        </div>
      </PhoneShell>
    );

  const isRead = story.story_type === "bedtime_text";
  const skill = skillKeyFor(story as any);
  const builds = buildsFor(story);
  const gp = (story.generation_params ?? {}) as Record<string, any>;
  const mine = !!story.owner_profile_id || (story.is_generated && story.story_type !== "pre_recorded" && !!story.child_profile_id);
  const totalSecs = episodes.reduce((a, e) => a + (Number(e.duration) || 0), 0);
  const multi = !isRead && episodes.length > 1;

  // Where to pick up from.
  const lastEp = pid ? getLastEpisode(pid, story.id) : 1;
  const lastPos = pid ? getPosition(pid, story.id, lastEp) : 0;
  const resumeEp = multi && pid && (lastPos > 0 || lastEp > 1) && !isEpisodeDone(pid, story.id, episodes.length) ? lastEp : null;

  const chips = [
    mine ? `Made for ${gp.name || childName || "your child"}${gp.age ? `, age ${gp.age}` : ""}` : story.age_group ? `Age ${story.age_group}` : null,
    isRead ? "Read aloud" : [mins(totalSecs) ? `${mins(totalSecs)} min` : null, multi ? `${episodes.length} episodes` : null].filter(Boolean).join(" · ") || "Listen",
    storyLanguage(story) === "hindi" ? "हिंदी" : "English",
  ].filter(Boolean) as string[];

  const play = () => {
    if (isRead) return nav(`/bedtime/${story.id}/read`);
    nav(resumeEp ? `/player/${story.id}/${resumeEp}` : `/player/${story.id}`, { state: { from: location.pathname } });
  };

  const summary = ((story as any).parent_summary as string | null) || story.description;

  return (
    <PhoneShell>
      <main className="flex-1 overflow-y-auto pb-10">
        <div className="relative h-[220px] w-full overflow-hidden md:mt-6 md:rounded-[28px]">
          <SkillPicture skill={skill} />
          <Link
            to={backTo}
            className="absolute left-3 top-3 inline-flex min-h-10 items-center gap-1 rounded-full bg-card/90 px-3 text-sm font-semibold text-foreground backdrop-blur"
          >
            <ChevronLeft className="h-4 w-4" /> {backLabel}
          </Link>
        </div>

        <div className="px-5 pt-4">
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex min-h-7 items-center rounded-full bg-primary/10 px-3 text-[13px] font-semibold text-primary">{builds.name}</span>
            {chips.map((c) => (
              <span key={c} className="inline-flex min-h-7 items-center rounded-full bg-muted px-3 text-[13px] font-semibold text-foreground">
                {c}
              </span>
            ))}
          </div>
          <h1 className="mt-3 font-[Quicksand] text-[26px] font-bold leading-tight text-foreground">{story.title}</h1>

          {getStoryStatus(story) === "ready" ? (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={play} className="inline-flex flex-1 items-center justify-center gap-2 bg-primary text-primary-foreground">
                {isRead ? <BookOpen className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                {isRead ? "Read aloud" : resumeEp ? `Continue episode ${resumeEp}` : "Play"}
              </button>
              <button
                type="button"
                onClick={onToggleSave}
                aria-pressed={saved}
                aria-label={saved ? "Saved. Tap to remove" : "Save to My stories"}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary"
              >
                <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <StoryStatusCard story={story} variant="row" />
            </div>
          )}

          <section className="mt-6 rounded-[18px] bg-accent p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/70">What this story builds</h2>
            <div className="mt-1 font-semibold text-foreground">{builds.name}</div>
            {builds.line && <p className="mt-0.5 text-[15px] text-foreground/80">{builds.line}</p>}
          </section>

          {summary && (
            <section className="mt-6">
              <h2 className="font-[Quicksand] text-[19px] font-bold text-foreground">About this story</h2>
              <p className={`mt-1.5 text-[15px] leading-relaxed text-foreground/80 ${!showFull && summary.length > 260 ? "line-clamp-5" : ""}`}>{summary}</p>
              {summary.length > 260 && (
                <button type="button" onClick={() => setShowFull((v) => !v)} className="mt-1 min-h-10 text-sm font-semibold text-primary">
                  {showFull ? "Show less" : "Read more"}
                </button>
              )}
            </section>
          )}

          {multi && (
            <section className="mt-6">
              <h2 className="mb-2 font-[Quicksand] text-[19px] font-bold text-foreground">Episodes</h2>
              <ol className="divide-y divide-border rounded-[18px] border border-border bg-card">
                {episodes.map((ep) => {
                  const sub = cleanEpisodeTitle(ep.title, story.title, ep.episode_number);
                  const done = pid ? isEpisodeDone(pid, story.id, ep.episode_number) : false;
                  const pos = pid ? getPosition(pid, story.id, ep.episode_number) : 0;
                  const left = !done && pos > 0 && ep.duration ? mins(Number(ep.duration) - pos) : null;
                  const meta = [mins(Number(ep.duration)) ? `${mins(Number(ep.duration))} min` : null, done ? "Listened" : left ? `${left} min left` : null]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={ep.id}>
                      <button
                        type="button"
                        onClick={() => nav(`/player/${story.id}/${ep.episode_number}`, { state: { from: location.pathname } })}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <span
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                            done ? "bg-primary text-primary-foreground" : "border border-border text-foreground"
                          }`}
                        >
                          {done ? <Check className="h-4 w-4" /> : ep.episode_number}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-foreground">{sub || `Episode ${ep.episode_number}`}</span>
                          {meta && <span className="block text-sm text-muted-foreground">{meta}</span>}
                        </span>
                        <Play className="h-4 w-4 flex-shrink-0 fill-current text-primary" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      </main>
    </PhoneShell>
  );
};

export default StoryDetail;
