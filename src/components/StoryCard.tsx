import { Link, useLocation } from "react-router-dom";
import type { Story } from "@/lib/stories";
import { getStoryStatus } from "@/lib/storyStatus";
import { SkillPicture, skillKeyFor } from "./SkillPicture";
import { StoryStatusCard } from "./StoryStatusCard";
import { BUCKETS, type BucketKey } from "@/lib/themeCatalog";

const bucketCardName = (story: Story): string | null => {
  const key = (story as any).bucket_key as BucketKey | null | undefined;
  if (key && BUCKETS[key]) return BUCKETS[key].cardName;
  return story.theme ?? null;
};

/**
 * Real audio duration in seconds, if the backend stored one.
 * Never estimated and never derived from generation time.
 */
const realDurationSeconds = (story: Story): number | null => {
  const s = story as any;
  const candidates = [s.episode_duration_seconds, s.duration_seconds, s.duration, s.audio_duration];
  for (const c of candidates) {
    const n = typeof c === "string" ? Number(c) : c;
    if (typeof n === "number" && Number.isFinite(n) && n > 0) return n;
  }
  return null;
};

const formatBadgeFor = (story: Story): { label: string; variant: "mint" | "warm" } | null => {
  const t = story.story_type;
  if (t === "bedtime_text") return { label: "Read aloud", variant: "warm" };
  if (t === "personalised_audio" || t === "pre_recorded") {
    const secs = realDurationSeconds(story);
    const mins = secs ? Math.max(1, Math.round(secs / 60)) : null;
    return { label: mins ? `Listen · ${mins} min` : "Listen", variant: "mint" };
  }
  return null;
};

export const storyLanguage = (story: Story): "english" | "hindi" => {
  const gp = (story as any).generation_params;
  const lang = gp && typeof gp === "object" ? String(gp.language ?? "").toLowerCase() : "";
  return lang === "hindi" ? "hindi" : "english";
};



const metaLine = (story: Story, badge: { label: string } | null) => {
  const parts: string[] = [];
  const skill = bucketCardName(story);
  if (skill) parts.push(skill);
  if (badge) parts.push(badge.label.replace(/^[^A-Za-z]+/, ""));
  if (storyLanguage(story) === "hindi") parts.push("हिंदी");
  return parts.join(" · ");
};

export const StoryCard = ({
  story,
  variant = "grid",
  universeName,
}: {
  story: Story;
  variant?: "grid" | "row";
  universeName?: string | null;
}) => {
  const location = useLocation();
  const status = getStoryStatus(story);
  if (status === "preparing") {
    return <StoryStatusCard story={story} variant={variant} />;
  }
  if (status !== "ready") {
    return null;
  }

  const to = story.story_type === "bedtime_text" ? `/bedtime/${story.id}` : `/story/${story.id}`;
  const state = { from: location.pathname };
  const badge = formatBadgeFor(story);
  const skill = skillKeyFor(story as any);
  const isType3 = !!(story as any).universe_id;
  const characterName = isType3 ? (universeName ?? null) : null;

  if (variant === "row") {
    return (
      <Link
        to={to}
        state={state}
        className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-2.5 transition-colors hover:border-primary/40"
      >
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
          <SkillPicture skill={skill} />
        </div>
        <div className="min-w-0 flex-1">
          {characterName && <div className="text-[11px] font-semibold text-primary">{characterName}</div>}
          <div className="brand-title line-clamp-2 text-sm font-bold text-foreground">{story.title}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{metaLine(story, badge)}</div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      state={state}
      className="flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-card transition-colors hover:border-primary/40"
    >
      <div className="h-[104px] w-full overflow-hidden">
        <SkillPicture skill={skill} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 pb-3 pt-2.5">
        {characterName && <span className="text-[11px] font-semibold text-primary">{characterName}</span>}
        <div className="brand-title line-clamp-2 text-xs font-bold leading-snug text-foreground">{story.title}</div>
        <div className="truncate text-xs text-muted-foreground">{metaLine(story, badge)}</div>
      </div>
    </Link>
  );
};
