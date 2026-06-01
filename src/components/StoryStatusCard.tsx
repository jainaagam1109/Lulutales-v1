import { Link, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Story } from "@/lib/stories";
import { getStoryStatus, retryStory } from "@/lib/storyStatus";
import { TagChip } from "./TagChip";

type Props = { story: Story; variant?: "grid" | "row" };

export const StoryStatusCard = ({ story, variant = "grid" }: Props) => {
  const nav = useNavigate();
  const qc = useQueryClient();
  const status = getStoryStatus(story);

  const onRetry = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await retryStory(story.id);
      toast.success("Retrying… we'll let you know when it's ready.");
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["stories-for-profile"] });
      qc.invalidateQueries({ queryKey: ["story", story.id] });
      qc.invalidateQueries({ queryKey: ["library"] });
      nav(`/generating/${story.id}`);
    } catch {
      toast.error("Couldn't retry. Please try again.");
    }
  };

  const goToCreate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    nav(story.story_type === "bedtime_text" ? "/magic-hub/bedtime" : "/magic-hub/audio");
  };
  const goToProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    nav("/profile");
  };

  if (status === "preparing") {
    const inner = (
      <>
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
      </>
    );
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
        {inner}
      </Link>
    );
  }

  if (status === "stale") {
    return (
      <div
        className={`rounded-2xl border border-destructive/40 bg-card p-3 shadow-soft ${
          variant === "row" ? "flex items-center gap-3" : "flex flex-col gap-2"
        }`}
      >
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          {story.theme && <TagChip label={story.theme} />}
          <div className="mt-1 text-xs font-bold text-foreground line-clamp-2">
            {story.title || "Your story"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            We couldn't create this story. Tap to try again.
          </div>
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-primary-deep"
          >
            <RefreshCw className="h-3 w-3" /> Try again
          </button>
        </div>
      </div>
    );
  }

  // lang_age_failed
  return (
    <div
      className={`rounded-2xl border border-destructive/40 bg-card p-3 shadow-soft ${
        variant === "row" ? "flex items-center gap-3" : "flex flex-col gap-2"
      }`}
    >
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-foreground line-clamp-2">
          {story.title || "Your story"}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Hindi stories are available for ages 2–6 only.
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            onClick={goToCreate}
            className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-primary-deep"
          >
            Change language
          </button>
          <button
            onClick={goToProfile}
            className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-primary-deep"
          >
            Change child's age
          </button>
        </div>
      </div>
    </div>
  );
};
