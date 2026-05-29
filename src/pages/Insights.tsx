import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Clock, BookOpen, Flame } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { ProfileAvatarButton } from "@/components/ProfileAvatarButton";
import { FloatingMiniPlayer } from "@/components/FloatingMiniPlayer";
import {
  fetchStreak,
  fetchStoriesCompleted,
  fetchScreenTimeSeconds,
  fetchHabitBars,
  fetchCompletedThemes,
  fetchBestStreak,
  computeBadgesFromDb,
} from "@/lib/analytics";

const fmtMinutes = (seconds: number): string => {
  if (!seconds) return "0 min";
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min === 0 ? `${hr} hr` : `${hr}h ${min}m`;
};

const Insights = () => {
  const nav = useNavigate();
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

  const { data: habitBars = [] } = useQuery({
    queryKey: ["analytics-habit-bars", profileId],
    queryFn: () => fetchHabitBars(profileId!),
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

  const badges = computeBadgesFromDb(storiesHeard, completedThemes, bestStreak);

  return (
    <PhoneShell>
      <header className="px-5 pt-4 pb-2">
        <div className="mb-3 flex items-center justify-between">
          <ProfileAvatarButton />
          <button
            onClick={() => nav(-1)}
            className="flex items-center gap-1 text-xs text-primary-deep"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">
          What {childName} learned
        </h1>
      </header>

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
              Screen time saved
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
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            What {childName} is growing in
          </h2>
          {habitBars.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Once {childName} completes a few stories, their growth areas will show up here ✨
            </p>
          ) : (
            <div className="space-y-3">
              {habitBars.map((h) => (
                <div key={h.bucket}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-bold text-foreground">{h.label}</span>
                    <span className="text-muted-foreground">{h.pct}%</span>
                  </div>
                  <div className="mb-1 text-[11px] text-muted-foreground">
                    {h.recentTheme} · {h.storyCount}{" "}
                    {h.storyCount === 1 ? "story" : "stories"}
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-primary"
                      style={{ width: `${h.pct}%` }}
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

      <FloatingMiniPlayer />
      <BottomNav />
    </PhoneShell>
  );
};

export default Insights;
