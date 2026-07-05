import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { Story } from "@/lib/stories";
import { getStoryStatus } from "@/lib/storyStatus";

type Props = { story: Story; variant?: "grid" | "row" };

export const StoryStatusCard = ({ story, variant = "grid" }: Props) => {
  const status = getStoryStatus(story);
  if (status !== "preparing") return null;

  if (variant === "row") {
    return (
      <Link
        to={`/generating/${story.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
      >
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-card">
          <Loader2 className="h-5 w-5 animate-spin text-primary-deep" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-deep">
            In progress
          </div>
          <div className="truncate text-sm font-bold text-foreground">{story.title || "Your story"}</div>
          <div className="text-[10px] text-muted-foreground">Preparing your story…</div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/generating/${story.id}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
    >
      <div className="flex h-20 items-center justify-center bg-gradient-card">
        <Loader2 className="h-6 w-6 animate-spin text-primary-deep" />
      </div>
      <div className="space-y-1 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-deep">
          In progress
        </div>
        <div className="line-clamp-2 text-xs font-bold leading-snug text-foreground">
          {story.title || "Your story"}
        </div>
        <div className="text-[10px] text-muted-foreground">Preparing your story…</div>
      </div>
    </Link>
  );
};
