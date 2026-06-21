import { Link, useLocation } from "react-router-dom";
import type { Story } from "@/lib/stories";
import { getStoryStatus } from "@/lib/storyStatus";
import { TagChip } from "./TagChip";
import { StoryStatusCard } from "./StoryStatusCard";

const formatBadgeFor = (story_type: Story["story_type"]): { label: string; variant: "mint" | "warm" } | null => {
  if (story_type === "personalised_audio") return { label: "🎧 Listen · ~15 min", variant: "mint" };
  if (story_type === "pre_recorded") return { label: "🎧 Listen", variant: "mint" };
  if (story_type === "bedtime_text") return { label: "📖 Read aloud · ~5 min", variant: "warm" };
  return null;
};

export const StoryCard = ({ story, variant = "grid" }: { story: Story; variant?: "grid" | "row" }) => {
  const location = useLocation();
  const status = getStoryStatus(story);
  if (status !== "ready") {
    return <StoryStatusCard story={story} variant={variant} />;
  }

  const to = story.story_type === "bedtime_text" ? `/bedtime/${story.id}` : `/story/${story.id}`;
  const state = { from: location.pathname };

  // Type 1 & 2 (personalised_audio, bedtime_text): no age. Type 3 (pre_recorded): age bucket.
  const ageLabel =
    story.story_type === "pre_recorded" ? ageBucketFromAgeGroup(story.age_group) : null;

  const badge = formatBadgeFor(story.story_type);

  if (variant === "row") {
    return (
      <Link
        to={to}
        state={state}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition-colors hover:border-primary/40"
      >
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-card text-3xl">
          {story.thumbnail ?? "📖"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            {story.theme && <TagChip label={story.theme} />}
            {badge && <TagChip label={badge.label} variant={badge.variant} />}
          </div>
          <div className="mt-1 truncate text-sm font-bold text-foreground">{story.title}</div>
          {ageLabel && (
            <div className="text-xs text-muted-foreground">{ageLabel}</div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      state={state}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-colors hover:border-primary/40"
    >
      <div className="flex h-20 items-center justify-center bg-gradient-card text-4xl">
        {story.thumbnail ?? "📖"}
      </div>
      <div className="min-w-0 space-y-1 p-3">
        <div className="flex flex-wrap items-center gap-1">
          {story.theme && <TagChip label={story.theme} />}
          {badge && <TagChip label={badge.label} variant={badge.variant} />}
        </div>
        <div className="line-clamp-2 text-xs font-bold leading-snug text-foreground">{story.title}</div>
        {ageLabel && (
          <div className="text-[10px] text-muted-foreground">{ageLabel}</div>
        )}
      </div>
    </Link>
  );
};
