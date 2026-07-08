import { Link, useLocation } from "react-router-dom";
import type { Story } from "@/lib/stories";
import { getStoryStatus } from "@/lib/storyStatus";
import { TagChip } from "./TagChip";
import { StoryStatusCard } from "./StoryStatusCard";
import { useThemeBuckets, resolveThemeLabel } from "@/hooks/useThemeBuckets";
import { BUCKETS, type BucketKey } from "@/lib/themeCatalog";

const bucketCardName = (story: Story): string | null => {
  const key = (story as any).bucket_key as BucketKey | null | undefined;
  if (key && BUCKETS[key]) return BUCKETS[key].cardName;
  return story.theme ?? null;
};

const formatBadgeFor = (story_type: Story["story_type"]): { label: string; variant: "mint" | "warm" } | null => {
  if (story_type === "personalised_audio") return { label: "🎧 Listen · ~15 min", variant: "mint" };
  if (story_type === "pre_recorded") return { label: "🎧 Listen", variant: "mint" };
  if (story_type === "bedtime_text") return { label: "📖 Read aloud · ~5 min", variant: "warm" };
  return null;
};

const TILE_TINTS = [
  "hsl(var(--tag-warm-bg))",
  "hsl(var(--tag-cool-bg))",
  "hsl(var(--tag-mint-bg))",
  "hsl(var(--secondary))",
  "hsl(var(--primary) / 0.18)",
  "hsl(var(--accent) / 0.22)",
];

const hashId = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
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
        </div>
      </Link>
    );
  }

  // Type 3 = character-universe stories. Detected via universe_id.
  const isType3 = !!(story as any).universe_id;
  const characterName = isType3 ? (universeName ?? null) : null;
  const themeBuckets = useThemeBuckets();
  const themeLabel = isType3 ? resolveThemeLabel(themeBuckets, story.theme) : story.theme;

  const tileBg = TILE_TINTS[hashId(story.id) % TILE_TINTS.length];

  return (
    <Link
      to={to}
      state={state}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-colors hover:border-primary/40"
    >
      <div
        className="flex h-20 items-center justify-center text-4xl"
        style={{ background: tileBg }}
      >
        {story.thumbnail ?? "📖"}
      </div>
      {isType3 ? (
        <div className="flex min-w-0 flex-1 flex-col space-y-1.5 p-3">
          {characterName ? (
            <span className="text-[10px] font-semibold text-primary-deep">
              {characterName}
            </span>
          ) : null}
          <div className="line-clamp-2 min-h-[2.25rem] text-xs font-bold leading-snug text-foreground">
            {story.title}
          </div>
          {(themeLabel || badge) && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {themeLabel && <TagChip label={themeLabel} />}
              {badge && <TagChip label={badge.label} variant={badge.variant} />}
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col space-y-1 p-3">
          <div className="flex flex-wrap items-center gap-1">
            {story.theme && <TagChip label={story.theme} />}
            {badge && <TagChip label={badge.label} variant={badge.variant} />}
          </div>
          <div className="line-clamp-2 min-h-[2.25rem] text-xs font-bold leading-snug text-foreground">{story.title}</div>
        </div>
      )}
    </Link>
  );
};
