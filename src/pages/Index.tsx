import { useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wand2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sortStories } from "@/lib/sortStories";

const HOME_RECO_LIMIT = 6;
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { StoryCard } from "@/components/StoryCard";
import { InsightsSummary } from "@/components/InsightsSummary";
import { loadActiveProfileForUser } from "@/lib/activeProfile";
import { fetchStoriesForProfile, fetchStories, fetchFreshPersonalisedStories, fetchUniverses, fetchPlayCounts } from "@/lib/stories";
import { getStoryStatus } from "@/lib/storyStatus";
import { recordVisit } from "@/lib/progress";
import { fetchCompletedThemes } from "@/lib/analytics";

const PromiseSection = () => (
  <section className="rounded-2xl border border-border border-l-4 border-l-primary bg-card p-4 shadow-soft">
    <div className="text-[10px] font-semibold text-primary-deep">
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

  const { data: playCounts = new Map<string, number>() } = useQuery({
    queryKey: ["story-play-counts"],
    queryFn: fetchPlayCounts,
  });

  const catalog = useMemo(() => {
    const pool = allStories.filter((s) => s.story_type === "pre_recorded");
    const childAge = activeProfile?.age ?? null;
    const sorted = sortStories(pool, { childAge, playCounts, completedThemes });
    return sorted.slice(0, HOME_RECO_LIMIT);
  }, [allStories, activeProfile?.age, completedThemes, playCounts]);

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
  const title = "Welcome to LuluTales ✨";
  const subtitle =
    hasChild && childName
      ? `Helping ${childName} grow, one story at a time`
      : "Helping your child grow, one story at a time";

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
        <div className="mb-0.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            {hasChild && childName ? `Stories ${childName} might love` : "Stories to explore"}
          </h2>
          <button
            onClick={() => nav("/happy-place#recommended")}
            className="text-[11px] font-bold text-primary-deep"
          >
            See all →
          </button>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          {hasChild && childName
            ? `Picks based on what ${childName} has enjoyed so far.`
            : "Picks based on what your child has enjoyed so far."}
        </p>
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
        <div className="mb-0.5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            Freshly curated for you
          </h2>
        </div>
        <p className="mb-1 text-xs text-muted-foreground">
          {childName
            ? `New stories added just for ${childName}, updated regularly.`
            : "New stories added just for your child, updated regularly."}
        </p>
        {childName && (
          <p className="mb-2 text-[11px] text-muted-foreground">
            Made just for {childName} — only visible on this profile.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {ready.map((s) => (
            <StoryCard key={s.id} story={s} universeName={nameFor(s)} />
          ))}
        </div>
      </section>
    );
  };


  return (
    <PhoneShell>
      <PageHeader showBack={false} title={title} subtitle={subtitle} />

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] space-y-5">
        {profileLoading || !storiesResolved ? (
          <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
            <Sparkles className="mr-2 h-4 w-4 animate-pulse" /> Loading…
          </div>
        ) : hasStory ? (
          <>
            <InsightsSummary profileId={profileId} variant="card" childName={childName ?? undefined} />
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
