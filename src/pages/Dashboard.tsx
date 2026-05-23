import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, Sparkles, BarChart3, ChevronRight, Loader2 } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { ProfileAvatarButton } from "@/components/ProfileAvatarButton";
import { fetchStoriesForProfile } from "@/lib/stories";
import { supabase } from "@/integrations/myproject/client";
import {
  recordVisit,
  getVisits,
  getCompletions,
  computeStreak,
  last7Days,
  computeBadges,
} from "@/lib/progress";

const Dashboard = () => {
  const nav = useNavigate();
  const childName = localStorage.getItem("lulutales_child_name") ?? "friend";
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;

  useEffect(() => {
    if (profileId) recordVisit(profileId);
  }, [profileId]);

  const { data: stories = [] } = useQuery({
    queryKey: ["stories-for-profile", profileId],
    queryFn: () => (profileId ? fetchStoriesForProfile(profileId) : Promise.resolve([])),
    enabled: !!profileId,
  });

  const { data: pendingStories = [] } = useQuery({
    queryKey: ["pending-stories", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("stories")
        .select("id")
        .eq("child_profile_id", profileId)
        .eq("is_generated", false)
        .gte("created_at", tenMinAgo)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!profileId,
    refetchInterval: 30000,
  });
  const pending = pendingStories[0];

  const lastId = typeof window !== "undefined" ? localStorage.getItem("lulutales_last_story") : null;
  const lastCompleted = typeof window !== "undefined" && localStorage.getItem("lulutales_last_story_completed") === "1";
  const lastProgressRaw = typeof window !== "undefined" ? parseInt(localStorage.getItem("lulutales_last_story_progress") ?? "0", 10) : 0;
  const lastProgress = isFinite(lastProgressRaw) ? Math.max(0, Math.min(100, lastProgressRaw)) : 0;
  const generatedStories = stories.filter(
    (s) => s.is_generated && (s.story_type === "personalised_audio" || s.story_type === "pre_recorded")
  );
  const ongoingFromLast = lastId && !lastCompleted ? generatedStories.find((s) => s.id === lastId) : undefined;
  const ongoing = ongoingFromLast ?? generatedStories[0];
  const ongoingProgress = ongoing && ongoingFromLast ? lastProgress : 0;

  const { visits, completions, streak, week, badges } = useMemo(() => {
    if (!profileId) {
      return { visits: [], completions: [], streak: 0, week: last7Days([]), badges: [] };
    }
    const v = getVisits(profileId);
    const c = getCompletions(profileId);
    return {
      visits: v,
      completions: c,
      streak: computeStreak(v),
      week: last7Days(v),
      badges: computeBadges(v, c),
    };
  }, [profileId, stories.length]);


  return (
    <PhoneShell>
      <header className="flex items-center gap-3 px-5 pt-6 pb-4">
        <ProfileAvatarButton />
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Good evening,</div>
          <h1 className="text-2xl font-extrabold text-foreground">{childName}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
        {pending && (
          <button
            onClick={() => nav(`/generating/${pending.id}`)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-soft"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary-deep" />
            <div className="flex-1 text-xs font-semibold text-foreground">
              A story is being created for {childName}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ongoing story
          </h2>
          {ongoing ? (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-card text-3xl">
                  {ongoing.thumbnail ?? "📖"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{ongoing.title}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{ongoing.theme}</div>
                </div>
                <button
                  onClick={() => nav(`/player/${ongoing.id}`)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
                  aria-label="Play"
                >
                  <Play className="h-5 w-5 fill-current" />
                </button>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-primary transition-all"
                  style={{ width: `${ongoingProgress}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">{ongoingProgress}% complete</div>
            </div>
          ) : (
            <button
              onClick={() => nav("/magic-hub")}
              className="block w-full rounded-2xl border border-dashed border-border bg-card p-4 text-left text-sm text-muted-foreground shadow-soft"
            >
              No stories yet — create one in Magic Hub ✨
            </button>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {streak > 0 ? `${streak}-day streak` : "7-day streak"}
            </h2>
          </div>
          <div className="flex items-center justify-between">
            {week.map((d) => (
              <div
                key={d.date}
                className={`h-7 w-7 rounded-full border ${
                  d.on ? "border-primary bg-gradient-primary" : "border-border bg-card"
                }`}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Badges earned
          </h2>
          {badges.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Finish a story or build a streak to start earning badges ✨
            </p>
          ) : (
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-soft"
                >
                  <span className="text-base">{b.emoji}</span>
                  {b.label}
                </div>
              ))}
            </div>
          )}
        </section>


        <button
          onClick={() => nav("/magic-hub")}
          className="block w-full rounded-2xl bg-gradient-primary p-[2px] text-left shadow-glow"
        >
          <div className="flex items-center gap-3 rounded-[14px] bg-card p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-2xl text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-extrabold text-foreground">Generate a story ✨</div>
              <div className="text-xs text-muted-foreground">Create a personalised tale</div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </button>

        <button
          onClick={() => nav("/insights")}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft"
        >
          <BarChart3 className="h-5 w-5 text-primary-deep" />
          <div className="flex-1 text-sm font-bold text-foreground">View Insights</div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default Dashboard;
