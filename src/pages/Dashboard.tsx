import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, Wand2, ChevronRight, Loader2, BarChart3, Flame, Palette, BookOpen } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { StoryCard } from "@/components/StoryCard";
import { fetchStoriesForProfile, fetchStories } from "@/lib/stories";
import { supabase } from "@/integrations/supabase/client";
import { recordVisit } from "@/lib/progress";
import {
  fetchStreak,
  fetchStoriesCompleted,
  fetchCompletedThemes,
  fetchBestStreak,
  computeBadgesFromDb,
} from "@/lib/analytics";


type Pronouns = { object: string; possessive: string };

const pronounsFor = (gender?: string | null): Pronouns => {
  const g = (gender ?? "").toLowerCase();
  if (g === "male" || g === "boy" || g === "m") return { object: "him", possessive: "his" };
  if (g === "female" || g === "girl" || g === "f") return { object: "her", possessive: "her" };
  return { object: "them", possessive: "their" };
};

const ageBucket = (age?: number | null): string | null => {
  if (!age || !isFinite(age)) return null;
  if (age <= 3) return "2-3";
  if (age <= 5) return "4-5";
  if (age <= 7) return "6-7";
  if (age <= 9) return "8-9";
  return "10+";
};

const Dashboard = () => {
  const nav = useNavigate();
  const childName = localStorage.getItem("lulutales_child_name") ?? "friend";
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;

  useEffect(() => {
    if (profileId) recordVisit(profileId);
  }, [profileId]);

  const { data: profile } = useQuery({
    queryKey: ["child-profile", profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data } = await supabase
        .from("child_profiles")
        .select("name, age, gender")
        .eq("id", profileId)
        .maybeSingle();
      return data;
    },
    enabled: !!profileId,
  });

  const pronouns = pronounsFor(profile?.gender);

  const { data: stories = [] } = useQuery({
    queryKey: ["stories-for-profile", profileId],
    queryFn: () => (profileId ? fetchStoriesForProfile(profileId) : Promise.resolve([])),
    enabled: !!profileId,
  });

  const { data: allStories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: fetchStories,
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

  const { data: streak = 0 } = useQuery({
    queryKey: ["analytics-streak", profileId],
    queryFn: () => fetchStreak(profileId!),
    enabled: !!profileId,
  });

  const { data: storiesListened = 0 } = useQuery({
    queryKey: ["analytics-stories-completed", profileId],
    queryFn: () => fetchStoriesCompleted(profileId!),
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

  const themesExplored = completedThemes.length;

  const badges = useMemo(
    () => computeBadgesFromDb(storiesListened, completedThemes, bestStreak),
    [storiesListened, completedThemes, bestStreak]
  );

  // Story-room picks: only pre-recorded stories from the story room.
  // Priority: featured (latest recommended) first, then latest other stories.
  const recommended = useMemo(() => {
    const pool = allStories.filter((s) => s.story_type === "pre_recorded");
    const featured = pool
      .filter((s) => s.is_featured)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    const others = pool
      .filter((s) => !s.is_featured)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return [...featured, ...others].slice(0, 2);
  }, [allStories]);



  return (
    <PhoneShell>
      <PageHeader
        showBack={false}
        title={`${childName}'s world 🌟`}
        subtitle={`Building ${pronouns.object}, one story at a time`}
      />

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

        {/* Continue listening */}
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Continue listening
          </h2>
          {ongoing ? (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-card text-3xl">
                  {ongoing.thumbnail ?? "📖"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{ongoing.title}</div>
                  {ongoing.theme && (
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{ongoing.theme}</div>
                  )}
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

        {/* Curate CTA — the only dark element */}
        <button
          onClick={() => nav("/magic-hub")}
          className="block w-full rounded-2xl bg-[hsl(222_47%_15%)] p-5 text-left shadow-glow"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-white">
                What's on {childName}'s mind lately?
              </div>
              <div className="mt-1 text-xs leading-relaxed text-white/70">
                Share a little, and we'll craft a story just for {pronouns.object}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-white/60" />
          </div>
        </button>

        {/* Insights + badges combined */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
              <Flame className="h-4 w-4 text-primary-deep" />
              <div className="mt-1 text-lg font-extrabold text-foreground">{streak}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Day streak</div>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
              <Palette className="h-4 w-4 text-primary-deep" />
              <div className="mt-1 text-lg font-extrabold text-foreground">{themesExplored}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Themes</div>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
              <BookOpen className="h-4 w-4 text-primary-deep" />
              <div className="mt-1 text-lg font-extrabold text-foreground">{storiesListened}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Stories</div>
            </div>
          </div>

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

          <button
            onClick={() => nav("/insights")}
            className="mt-4 flex w-full items-center gap-2 border-t border-border pt-3 text-left"
          >
            <BarChart3 className="h-4 w-4 text-primary-deep" />
            <div className="flex-1 text-xs font-bold text-foreground">See full insights</div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </section>

        {/* Our promise to you */}
        <section className="rounded-2xl border border-border border-l-4 border-l-primary bg-card p-4 shadow-soft">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-deep">
            Our promise to you
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            Every story here quietly builds a life skill in {childName} — through joy, not lectures.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Expert approved", "Screen-light", "Personalised"].map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-foreground"
              >
                ✦ {t}
              </span>
            ))}
          </div>
        </section>

        {/* Stories from the story room */}
        {recommended.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stories {childName} might love
              </h2>
              <button
                onClick={() => nav("/library")}
                className="text-[11px] font-bold text-primary-deep"
              >
                Story room →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recommended.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          </section>
        )}

      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default Dashboard;
