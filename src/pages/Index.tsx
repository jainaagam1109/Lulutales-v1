import { useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wand2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { recommendForAge } from "@/lib/recommend";

const HOME_RECO_LIMIT = 6;
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { StoryCard } from "@/components/StoryCard";
import { InsightsSummary } from "@/components/InsightsSummary";
import { loadActiveProfileForUser } from "@/lib/activeProfile";
import { fetchStoriesForProfile, fetchStories, fetchFreshPersonalisedStories, fetchUniverses } from "@/lib/stories";
import { getStoryStatus } from "@/lib/storyStatus";
import { recordVisit } from "@/lib/progress";
import { fetchCompletedThemes } from "@/lib/analytics";

const PromiseSection = () => (
  <section className="rounded-2xl border border-border border-l-4 border-l-primary bg-card p-4 shadow-soft">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-deep">
      Our promise to you
    </div>
    <p className="mt-1.5 text-sm leading-relaxed text-foreground">
      Every story here quietly builds a life skill — through joy, not lectures.
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
);

const Index = () => {
  const { session, user, loading } = useAuth();
  const nav = useNavigate();

  const { data: activeProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["active-profile", user?.id],
    queryFn: () => loadActiveProfileForUser(user!.id),
    enabled: !!user?.id,
  });

  const profileId = activeProfile?.id ?? null;
  const childName = activeProfile?.name ?? null;

  useEffect(() => {
    if (profileId) recordVisit(profileId);
  }, [profileId]);

  const { data: profileStories, isLoading: storiesLoading } = useQuery({
    queryKey: ["stories-for-profile", profileId],
    queryFn: () => fetchStoriesForProfile(profileId!),
    enabled: !!profileId,
  });

  const personalisedStories = useMemo(
    () =>
      (profileStories ?? []).filter(
        (s) =>
          s.is_generated &&
          (s.story_type === "personalised_audio" || s.story_type === "bedtime_text")
      ),
    [profileStories]
  );
  const storiesResolved = !profileId || (!storiesLoading && profileStories !== undefined);
  const hasStory = personalisedStories.length > 0;

  const { data: allStories = [] } = useQuery({ queryKey: ["stories"], queryFn: fetchStories });
  const { data: universes = [] } = useQuery({ queryKey: ["universes"], queryFn: fetchUniverses });
  const universesMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of universes) if (u.id && u.display_name) m.set(u.id, u.display_name);
    return m;
  }, [universes]);
  const nameFor = (s: any): string | null => universesMap.get(s?.universe_id) ?? null;

  const { data: completedThemes = [] } = useQuery({
    queryKey: ["analytics-completed-themes", profileId],
    queryFn: () => fetchCompletedThemes(profileId!),
    enabled: !!profileId,
  });


  const catalog = useMemo(() => {
    const pool = allStories.filter((s) => s.story_type === "pre_recorded");
    const fallback = () => {
      const featured = pool
        .filter((s) => s.is_featured)
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      const others = pool
        .filter((s) => !s.is_featured)
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      return [...featured, ...others].slice(0, HOME_RECO_LIMIT);
    };
    const childAge = activeProfile?.age ?? null;
    if (childAge == null) return fallback();
    const ranked = recommendForAge(pool, childAge, completedThemes);
    return ranked.length > 0 ? ranked.slice(0, HOME_RECO_LIMIT) : fallback();
  }, [allStories, activeProfile?.age, completedThemes]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  if (!session) return <Navigate to="/auth" replace />;

  const hasChild = !!activeProfile;
  const goCreate = () => nav(hasChild ? "/magic-hub" : "/onboarding");

  // ---------- titles ----------
  const title =
    hasChild && childName
      ? `${childName}'s Story Worlds`
      : "Welcome to LuluTales ✨";
  const subtitle =
    hasChild && childName
      ? `Helping ${childName} grow, one story at a time`
      : "Create your child's first story";

  const ctaLabel =
    hasChild && childName
      ? `Create a story starring ${childName}`
      : "Create your child's first story";

  const CreateHero = () => (
    <button
      onClick={goCreate}
      className="block w-full rounded-2xl bg-[hsl(222_47%_15%)] p-5 text-left shadow-glow"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
          <Wand2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-white">{ctaLabel}</div>
          <div className="mt-1 text-xs leading-relaxed text-white/70">
            A magical, personalised story in minutes ✨
          </div>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-white/60" />
      </div>
    </button>
  );

  const Catalog = () =>
    catalog.length > 0 ? (
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {hasChild && childName ? `Stories ${childName} might love` : "Stories to explore"}
          </h2>
          <button
            onClick={() => nav("/library")}
            className="text-[11px] font-bold text-primary-deep"
          >
            Story Worlds →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {catalog.map((s) => (
            <StoryCard key={s.id} story={s} universeName={nameFor(s)} />
          ))}
        </div>
      </section>
    ) : null;

  const FreshlyCurated = () => {
    const { data: fresh = [] } = useQuery({
      queryKey: ["fresh-personalised", profileId],
      queryFn: () => (profileId ? fetchFreshPersonalisedStories(profileId) : Promise.resolve([])),
      enabled: !!profileId,
    });

    const ready = fresh.filter((s) => {
      if (getStoryStatus(s) !== "ready") return false;
      const t = (s.title ?? "").trim();
      if (!t || /error|failed/i.test(t) || t.toLowerCase() === "story" || t === "[Story title]") return false;
      if (s.story_type === "bedtime_text") return !!s.story_text && s.story_text.trim().length > 0;
      return true;
    });

    if (ready.length === 0) return null;

    return (
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Freshly curated for you
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ready.map((s) => (
            <StoryCard key={s.id} story={s} universeName={nameFor(s)} />
          ))}
        </div>
      </section>
    );
  };

  const Insights = () => (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
          <Flame className="h-4 w-4 text-primary-deep" />
          <div className="mt-1 text-lg font-extrabold text-foreground">{streak}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            Day streak
          </div>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
          <Palette className="h-4 w-4 text-primary-deep" />
          <div className="mt-1 text-lg font-extrabold text-foreground">
            {completedThemes.length}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Life-skills learnt</div>
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
  );

  return (
    <PhoneShell>
      <PageHeader showBack={false} title={title} subtitle={subtitle} />

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-5">
        {profileLoading || !storiesResolved ? (
          <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
            <Sparkles className="mr-2 h-4 w-4 animate-pulse" /> Loading…
          </div>
        ) : hasStory ? (
          <>
            <Insights />
            <PromiseSection />
            <FreshlyCurated />
            <Catalog />
            <CreateHero />
          </>
        ) : (
          <>
            <PromiseSection />
            <FreshlyCurated />
            <CreateHero />
            <Catalog />
          </>
        )}
      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default Index;
