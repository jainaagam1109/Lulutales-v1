import { Link } from "react-router-dom";
import type { Story } from "@/lib/stories";
import { getStoryStatus } from "@/lib/storyStatus";
import { SkillPicture, skillKeyFor } from "@/components/SkillPicture";

type Props = { story: Story; variant?: "grid" | "row" };

/** Card for a story that is still being made. Opens the "being made" screen. */
export const StoryStatusCard = ({ story, variant = "grid" }: Props) => {
  const status = getStoryStatus(story);
  if (status !== "preparing") return null;
  const skill = skillKeyFor(story);

  const Pic = ({ h }: { h: string }) => (
    <div className={`relative ${h} overflow-hidden`}>
      <SkillPicture skill={skill} className="opacity-50" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
      </span>
    </div>
  );

  if (variant === "row") {
    return (
      <Link
        to={`/generating/${story.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5"
      >
        <div className="w-16 flex-shrink-0 overflow-hidden rounded-xl">
          <Pic h="h-16" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="brand-title truncate text-foreground">{story.title || "Your new story"}</div>
          <div className="mt-0.5 text-xs font-semibold text-primary">Being made · about 5 minutes</div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/generating/${story.id}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <Pic h="h-[104px]" />
      <div className="space-y-1 p-3">
        <div className="brand-title line-clamp-2 text-foreground">{story.title || "Your new story"}</div>
        <div className="text-xs font-semibold text-primary">Being made…</div>
      </div>
    </Link>
  );
};
