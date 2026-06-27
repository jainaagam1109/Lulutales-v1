
import { useQuery } from "@tanstack/react-query";
import { Clock, BookOpen, Flame } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";

import {
  fetchStreak,
  fetchStoriesCompleted,
  fetchScreenTimeSeconds,
  fetchBucketBreakdown,
  fetchCompletedThemes,
  fetchBestStreak,
  computeBadgesFromDb,
} from "@/lib/analytics";
import { useThemeBuckets } from "@/hooks/useThemeBuckets";

const fmtMinutes = (seconds: number): string => {
  if (!seconds) return "0 min";
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min === 0 ? `${hr} hr` : `${hr}h ${min}m`;
};

const Insights = () => {
  
  const childName = localStorage.getItem("lulutales_child_name") ?? "your child";
  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;

  const { data: streak = 0 } = useQuery({
    queryKey: ["analytics-streak", profileId],
    queryFn: () => fetchStreak(profileId!),
    enabled: !!profileId,
  });

  const { data: storiesHeard = 0 } = useQuery({
    queryKey: ["analytics-stories-completed", profileId],
    queryFn: () => fetchStoriesCompleted(profileId!),
    enabled: !!profileId,
  });

  const { data: screenTimeSec = 0 } = useQuery({
    queryKey: ["analytics-screen-time", profileId],
    queryFn: () => fetchScreenTimeSeconds(profileId!),
    enabled: !!profileId,
  });

  const { data: bucketBars = [] } = useQuery({
    queryKey: ["analytics-bucket-breakdown", profileId],
    queryFn: () => fetchBucketBreakdown(profileId!),
    enabled: !!profileId,
  });

  const { data: completedThemes = [] } = useQuery({
    queryKey: ["analytics-completed-themes", profileId],
    queryFn: () => fetchCompletedThemes(profileId!),
    enabled: !!profileId,
  });

  const { data: bestStreak = 0 } = useQuery({
    queryKey: ["analytics-best-streak", profileId],
    queryFn: () => fetchBestStreak(profileId!),
    enabled: !!profileId,
  });

  const themeBuckets = useThemeBuckets();
  const badges = computeBadgesFromDb(storiesHeard, completedThemes, bestStreak, themeBuckets);

  return (
    <PhoneShell>
      <PageHeader title={`What ${childName} learned`} />

      <main className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
            <BookOpen className="h-5 w-5 text-primary-deep" />
            <div className="mt-2 text-lg font-extrabold text-foreground">{storiesHeard}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Stories heard
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
            <Clock className="h-5 w-5 text-primary-deep" />
            <div className="mt-2 text-lg font-extrabold text-foreground">
              {fmtMinutes(screenTimeSec)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Screen time saved <span className="normal-case tracking-normal">(est.)</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
            <Flame className="h-5 w-5 text-primary-deep" />
            <div className="mt-2 text-lg font-extrabold text-foreground">{streak}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Day streak
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            What {childName} has been exploring
          </h2>
          <p className="mb-3 mt-1 text-[11px] text-muted-foreground">
            Based on stories completed — each story builds the skill.
          </p>
          {bucketBars.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Once {childName} completes a few stories, their growth areas will show up here ✨
            </p>
          ) : (
            <div className="space-y-3">
              {bucketBars.map((b) => (
                <div key={b.bucket}>
                  <div className="mb-1 text-xs font-bold text-foreground">{b.bucket}</div>
                  <div className="mb-1 text-[11px] text-muted-foreground">
                    {b.storyCount} {b.storyCount === 1 ? "story" : "stories"}
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-primary"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Badges earned
          </h2>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Finish a story or build a streak to start earning badges ✨
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-soft"
                >
                  <span>{b.emoji}</span>
                  <span className="font-semibold text-foreground">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />

    </PhoneShell>
  );
};

export default Insights;
