import { Link, useLocation } from "react-router-dom";
import type { Story } from "@/lib/stories";
import { getStoryStatus } from "@/lib/storyStatus";
import { TagChip } from "./TagChip";
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
  if (t === "bedtime_text") return { label: "📖 Read aloud", variant: "warm" };
  if (t === "personalised_audio" || t === "pre_recorded") {
    const secs = realDurationSeconds(story);
    const mins = secs ? Math.max(1, Math.round(secs / 60)) : null;
    return { label: mins ? `🎧 Listen · ~${mins} min` : "🎧 Listen", variant: "mint" };
  }
  return null;
};

export const storyLanguage = (story: Story): "english" | "hindi" => {
  const gp = (story as any).generation_params;
  const lang = gp && typeof gp === "object" ? String(gp.language ?? "").toLowerCase() : "";
  return lang === "hindi" ? "hindi" : "english";
};

const languageLabel = (story: Story) => (storyLanguage(story) === "hindi" ? "हिंदी" : "English");

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
            {(() => { const l = bucketCardName(story); return l && <TagChip label={l} />; })()}
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
          {(bucketCardName(story) || badge) && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {bucketCardName(story) && <TagChip label={bucketCardName(story)!} />}
              {badge && <TagChip label={badge.label} variant={badge.variant} />}
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col space-y-1 p-3">
          <div className="flex flex-wrap items-center gap-1">
            {(() => { const l = bucketCardName(story); return l && <TagChip label={l} />; })()}
            {badge && <TagChip label={badge.label} variant={badge.variant} />}
          </div>
          <div className="line-clamp-2 min-h-[2.25rem] text-xs font-bold leading-snug text-foreground">{story.title}</div>
        </div>
      )}
    </Link>
  );
};
