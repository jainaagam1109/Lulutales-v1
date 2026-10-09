import { useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sortStories } from "@/lib/sortStories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { LuluLogo } from "@/components/LuluLogo";
import { ProfileSwitcherChip } from "@/components/ProfileAvatarButton";
import { MakeStoryCard } from "@/components/MakeStoryCard";
import { StoryShelf } from "@/components/StoryShelf";
import { loadActiveProfileForUser } from "@/lib/activeProfile";
import { fetchStoriesForProfile, fetchStories, fetchUniverses, fetchPlayCounts, type Story } from "@/lib/stories";
import { getStoryStatus } from "@/lib/storyStatus";
import { recordVisit } from "@/lib/progress";
import { fetchCompletedThemes } from "@/lib/analytics";
import { useFamily } from "@/lib/family";

const HOME_RECO_LIMIT = 8;
const MINE_LIMIT = 8;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

/** A story the family made that is worth showing (ready, with a real title, or still being made). */
const showable = (s: Story) => {
  const st = getStoryStatus(s);
  if (st === "preparing") return true;
  if (st !== "ready") return false;
  const t = (s.title ?? "").trim();
  if (!t || /error|failed/i.test(t) || t.toLowerCase() === "story" || t === "[Story title]") return false;
  if (s.story_type === "bedtime_text") return !!s.story_text && s.story_text.trim().length > 0;
  return true;
};

const Index = () => {
  const { session, user, loading } = useAuth();
  const fam = useFamily();

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

  const mine = useMemo(
    () =>
      (profileStories ?? [])
        .filter(
          (s) =>
            (s.story_type === "personalised_audio" || s.story_type === "bedtime_text") &&
            showable(s)
        )
        .slice(0, MINE_LIMIT),
    [profileStories]
  );
  const storiesResolved = !profileId || (!storiesLoading && profileStories !== undefined);

  const { data: allStories = [] } = useQuery({ queryKey: ["stories"], queryFn: fetchStories });
  const { data: universes = [] } = useQuery({ queryKey: ["universes"], queryFn: fetchUniverses });
  const universesMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of universes) if (u.id && u.display_name) m.set(u.id, u.display_name);
    return m;
  }, [universes]);
  const nameFor = (s: Story): string | null => universesMap.get((s as any)?.universe_id) ?? null;

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
    return sortStories(pool, { childAge, playCounts, completedThemes }).slice(0, HOME_RECO_LIMIT);
  }, [allStories, activeProfile?.age, completedThemes, playCounts]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>
    );
  if (!session) return <Navigate to="/auth" replace />;

  const hasChild = !!activeProfile;
  const name = childName || "your child";
  const waiting = fam.status === "waiting";
  const firstStory = !waiting && fam.status !== "blocked" && mine.length === 0;
  const possessive = childName ? `${childName}’s` : "Your child’s";

  const heading = waiting
    ? "Start tonight with a story from the library."
    : firstStory
      ? "Welcome to LuluTales."
      : `What will ${name} hear tonight?`;

  const libraryShelf = (
    <StoryShelf
      title={waiting ? "From the story library" : firstStory ? "Or start with the library" : `Picked for ${name}`}
      seeAllTo="/library"
      stories={catalog}
      nameFor={nameFor}
    />
  );

  return (
    <PhoneShell withNav>
      <header className="flex items-center justify-between px-5 pb-1 pt-3 md:hidden">
        <LuluLogo size={30} />
        <ProfileSwitcherChip />
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-10 md:pb-12 md:pt-10">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 pt-1">
            <span className="text-[15px] text-muted-foreground">{greeting()}</span>
            <h1 className="font-[Quicksand] text-[26px] font-bold leading-tight text-foreground md:text-[32px]">
              {heading}
            </h1>
          </div>

          {profileLoading || !storiesResolved || fam.loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Sparkles className="mr-2 h-4 w-4 animate-pulse" /> Loading…
            </div>
          ) : (
            <>
              <div className="md:max-w-[560px]">
                <MakeStoryCard childName={childName} hasChild={hasChild} firstStory={firstStory} />
              </div>

              {waiting || firstStory ? (
                libraryShelf
              ) : (
                <>
                  <StoryShelf title={`${possessive} stories`} seeAllTo="/my-stories" stories={mine} nameFor={nameFor} />
                  {libraryShelf}
                </>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default Index;
