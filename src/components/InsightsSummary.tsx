import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Flame, Palette, BookOpen, BarChart3, ChevronRight } from "lucide-react";
import {
  fetchStreak,
  fetchStoriesCompleted,
  fetchCompletedThemes,
  fetchBestStreak,
  computeBadgesFromDb,
} from "@/lib/analytics";
import { useThemeBuckets } from "@/hooks/useThemeBuckets";

interface InsightsSummaryProps {
  profileId: string | null;
  /** "card" wraps the panel in a card with a "See full insights" link (Home). "plain" renders bare sections (Insights page). */
  variant?: "card" | "plain";
}

export const InsightsSummary = ({ profileId, variant = "card" }: InsightsSummaryProps) => {
  const nav = useNavigate();
  const enabled = !!profileId;

  const { data: streak = 0 } = useQuery({
    queryKey: ["analytics-streak", profileId],
    queryFn: () => fetchStreak(profileId!),
    enabled,
  });
  const { data: storiesListened = 0 } = useQuery({
    queryKey: ["analytics-stories-completed", profileId],
    queryFn: () => fetchStoriesCompleted(profileId!),
    enabled,
  });
  const { data: completedThemes = [] } = useQuery({
    queryKey: ["analytics-completed-themes", profileId],
    queryFn: () => fetchCompletedThemes(profileId!),
    enabled,
  });
  const { data: bestStreak = 0 } = useQuery({
    queryKey: ["analytics-best-streak", profileId],
    queryFn: () => fetchBestStreak(profileId!),
    enabled,
  });
  const themeBuckets = useThemeBuckets();
  const badges = useMemo(
    () => computeBadgesFromDb(storiesListened, completedThemes, bestStreak, themeBuckets),
    [storiesListened, completedThemes, bestStreak, themeBuckets]
  );

  const stats = (
    <div className="grid grid-cols-3 gap-2">
      <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
        <Flame className="h-4 w-4 text-primary-deep" />
        {streak === 0 ? (
          <div className="mt-1 text-[11px] font-bold leading-tight text-foreground">Start your streak</div>
        ) : (
          <div className="mt-1 text-lg font-extrabold text-foreground">{streak}</div>
        )}
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Day streak</div>
      </div>
      <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
        <Palette className="h-4 w-4 text-primary-deep" />
        <div className="mt-1 text-lg font-extrabold text-foreground">{completedThemes.length}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Life-skills learnt</div>
      </div>
      <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
        <BookOpen className="h-4 w-4 text-primary-deep" />
        <div className="mt-1 text-lg font-extrabold text-foreground">{storiesListened}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Stories</div>
      </div>
    </div>
  );

  const badgesBlock = (
    <div className="mt-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Badges earned
      </div>
      {badges.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Finish a story or build a streak to start earning badges ✨
        </p>
      ) : (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
          {badges.map((b) => (
            <div
              key={b.id}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground"
            >
              <span className="text-sm">{b.emoji}</span>
              {b.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (variant === "plain") {
    return (
      <>
        {stats}
        {badgesBlock}
      </>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      {stats}
      {badgesBlock}
      <button
        onClick={() => nav("/insights")}
        className="mt-4 flex w-full items-center gap-2 border-t border-border pt-3 text-left"
      >
        <BarChart3 className="h-4 w-4 text-primary-deep" />
        <div className="flex-1 text-xs font-bold text-foreground">See full insights</div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </section>
  );
};
