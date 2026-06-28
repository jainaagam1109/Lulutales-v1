import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { fetchStories, fetchStoriesForProfile, fetchUniverses, type Story, type Universe } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { SectionHeader } from "@/components/SectionHeader";
import { PageHeader } from "@/components/PageHeader";
import { TagChip } from "@/components/TagChip";
import { StoryCard } from "@/components/StoryCard";
import { StoryWorldsRow } from "@/components/StoryWorldsRow";
import { StoryFormatFilter, type StoryFormat } from "@/components/StoryFormatFilter";
import { getStoryStatus } from "@/lib/storyStatus";
import { fetchCompletedThemes } from "@/lib/analytics";
import { recommendForAge } from "@/lib/recommend";

import { getThemeVisual } from "@/lib/themeEmoji";

const StoryRowCard = ({ story, to }: { story: Story; to: string }) => {
  const visual = getThemeVisual(story.theme);
  return (
    <Link
      to={to}
      state={{ from: "/happy-place" }}
      className="flex w-44 flex-shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft transition-colors hover:border-primary/40"
    >
      <div
        className="flex h-20 items-center justify-center rounded-xl text-4xl"
        style={{ backgroundColor: visual.bg }}
      >
        {visual.emoji}
      </div>
      {story.theme && <TagChip label={story.theme} />}
      <div className="line-clamp-2 text-xs font-bold leading-snug text-foreground">
        {story.title}
      </div>
    </Link>
  );
};

const CreateCtaCard = () => (
  <Link
    to="/magic-hub"
    className="flex h-32 w-44 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-primary/40 bg-card/60 p-3 text-center transition-colors hover:border-primary"
  >
    <div className="text-2xl">✨</div>
    <div className="text-[11px] font-bold leading-snug text-foreground">
      You haven't created a story yet
    </div>
    <div className="text-[11px] font-semibold text-primary-deep">Create one</div>
  </Link>
);

const Row = ({
  stories,
  emptyVariant = "create",
  universesMap,
}: {
  stories: Story[];
  emptyVariant?: "create" | "coming-soon";
  universesMap?: Map<string, string>;
}) => {
  if (stories.length === 0) {
    if (emptyVariant === "coming-soon") {
      return (
        <div className="flex h-32 w-44 flex-shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 text-center text-[11px] font-semibold text-muted-foreground">
          Coming soon
        </div>
      );
    }
    return <CreateCtaCard />;
  }
  return (
    <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide">
      {stories.map((s) => {
        const universeName = universesMap?.get((s as any).universe_id) ?? null;
        return (
          <div key={s.id} className="w-44 flex-shrink-0">
            <StoryCard story={s} universeName={universeName} />
          </div>
        );
      })}
    </div>
  );
};


const HappyPlace = () => {
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;
  const childName = localStorage.getItem("lulutales_child_name");
  const hasActive = !!profileId;
  const pageTitle = childName && hasActive ? `${childName}'s Story Worlds` : "Story Worlds";
  const curatedTitle = childName && hasActive ? `Personalised audio for ${childName}` : "Personalised audio stories";

  const { data: allStories = [] } = useQuery({ queryKey: ["stories"], queryFn: fetchStories });
  const { data: profileStories = [] } = useQuery({
    queryKey: ["stories-for-profile", profileId],
    queryFn: () => (profileId ? fetchStoriesForProfile(profileId) : Promise.resolve([])),
    enabled: !!profileId,
  });
  const { data: completedThemes = [] } = useQuery({
    queryKey: ["analytics-completed-themes", profileId],
    queryFn: () => fetchCompletedThemes(profileId!),
    enabled: !!profileId,
  });
  const { data: universes = [] } = useQuery({
    queryKey: ["universes"],
    queryFn: fetchUniverses,
  });
  const universesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of universes) {
      if (u.id && u.display_name) map.set(u.id, u.display_name);
    }
    return map;
  }, [universes]);
  const childAge = (() => {
    const n = parseInt(localStorage.getItem("lulutales_child_age") ?? "", 10);
    return Number.isFinite(n) ? n : null;
  })();

  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<StoryFormat>("all");
  const showAudio = format !== "text";
  const showText = format !== "audio";

  const matches = (s: Story) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (s.title ?? "").toLowerCase().includes(q) ||
      (s.theme ?? "").toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      ((s as any).story_text ?? "").toLowerCase().includes(q)
    );
  };

  const isFailed = (s: Story) =>
    !s.title ||
    /error|failed/i.test(s.title) ||
    s.title.trim().toLowerCase() === "story" ||
    s.title.trim() === "[Story title]";

  // Include in-progress / failed stories so users see status; only hide stories
  // we shouldn't display at all (titleless garbage).
  const visible = (s: Story) => {
    const status = getStoryStatus(s);
    if (status === "ready") return !isFailed(s);
    return true;
  };

  const personalised = useMemo(
    () =>
      profileStories
        .filter((s) => s.story_type === "personalised_audio" && visible(s))
        .filter(matches)
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [profileStories, query]
  );

  const bedtime = useMemo(
    () =>
      profileStories
        .filter((s) => {
          if (s.story_type !== "bedtime_text") return false;
          if (!visible(s)) return false;
          if (getStoryStatus(s) === "ready" && (!s.story_text || s.story_text.trim().length === 0)) return false;
          return true;
        })
        .filter(matches)
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [profileStories, query]
  );

  const storyRoom = useMemo(
    () => allStories.filter((s) => s.story_type === "pre_recorded" && s.owner_profile_id === null).filter(matches),
    [allStories, query]
  );

  const madeForChild = useMemo(() => {
    const merged: Story[] = [];
    if (showAudio) merged.push(...personalised);
    if (showText) merged.push(...bedtime);
    return merged.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }, [personalised, bedtime, showAudio, showText]);

  const recommended = useMemo(() => {
    const list = storyRoom.filter((s) => {
      const featured = !!s.is_featured;
      const parsed = s.age_group ? parseInt(String(s.age_group).match(/\d+/)?.[0] ?? "", 10) : NaN;
      if (!Number.isFinite(parsed)) return featured;
      if (childAge == null) return featured;
      return featured || Math.abs(parsed - childAge) <= 1;
    });
    return list.sort((a, b) => {
      const af = a.is_featured ? 1 : 0;
      const bf = b.is_featured ? 1 : 0;
      if (af !== bf) return bf - af;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
  }, [storyRoom, childAge]);

  const counts = {
    all: personalised.length + bedtime.length + storyRoom.length,
    audio: personalised.length + storyRoom.length,
    text: bedtime.length,
  };

  return (
    <PhoneShell>
      <PageHeader showBack={false} title={pageTitle}>
        <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <StoryFormatFilter value={format} onChange={setFormat} counts={counts} className="mt-3" />
      </PageHeader>

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-6">
        {hasActive && (
          <section>
            <SectionHeader title={childName ? `Made for ${childName}` : "Made for you"} />
            {madeForChild.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4">
                <div className="text-sm text-muted-foreground">
                  No personalised stories yet — create one in Story Worlds.
                </div>
                <Link
                  to="/magic-hub"
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft"
                >
                  Go to Story Worlds
                </Link>
              </div>
            ) : (
              <Row stories={madeForChild} universesMap={universesMap} />
            )}
          </section>
        )}
        <StoryWorldsRow />



        {showAudio && (
          <section>
            <SectionHeader title="All stories" />
            <Row stories={storyRoom} emptyVariant="coming-soon" universesMap={universesMap} />
          </section>
        )}

      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default HappyPlace;
