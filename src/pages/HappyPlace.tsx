import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { fetchStories, fetchStoriesForProfile, type Story } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { SectionHeader } from "@/components/SectionHeader";
import { PageHeader } from "@/components/PageHeader";
import { TagChip } from "@/components/TagChip";
import { StoryCard } from "@/components/StoryCard";
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
}: {
  stories: Story[];
  emptyVariant?: "create" | "coming-soon";
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
      {stories.map((s) => (
        <div key={s.id} className="w-44 flex-shrink-0">
          <StoryCard story={s} />
        </div>
      ))}
    </div>
  );
};


const HappyPlace = () => {
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;
  const childName = localStorage.getItem("lulutales_child_name");
  const hasActive = !!profileId;
  const pageTitle = childName && hasActive ? `${childName}'s Happy Place` : "Happy Place";
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
  const childAge = (() => {
    const n = parseInt(localStorage.getItem("lulutales_child_age") ?? "", 10);
    return Number.isFinite(n) ? n : null;
  })();

  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<"all" | "audio" | "text">("all");

  const matchesFormat = useCallback(
    (s: Story) => {
      if (formatFilter === "all") return true;
      if (formatFilter === "audio") {
        return s.story_type === "personalised_audio" || s.story_type === "pre_recorded";
      }
      return s.story_type === "bedtime_text";
    },
    [formatFilter]
  );
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

  const madeForChild = useMemo(
    () =>
      profileStories
        .filter((s) => {
          if (s.story_type !== "personalised_audio" && s.story_type !== "bedtime_text") return false;
          if (!visible(s)) return false;
          if (s.story_type === "bedtime_text" && getStoryStatus(s) === "ready") {
            if (!s.story_text || s.story_text.trim().length === 0) return false;
          }
          return true;
        })
        .filter(matches)
        .filter(matchesFormat)
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [profileStories, query, formatFilter]
  );

  const storyRoom = useMemo(
    () => allStories.filter((s) => s.story_type === "pre_recorded" && s.owner_profile_id === null).filter(matches).filter(matchesFormat),
    [allStories, query, formatFilter]
  );

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

  const filterOptions: { key: "all" | "audio" | "text"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "audio", label: "Audio" },
    { key: "text", label: "Text" },
  ];

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
        <div className="mt-3 flex items-center justify-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
          {filterOptions.map((opt) => {
            const active = formatFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFormatFilter(opt.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </PageHeader>

      <main className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
        {hasActive && (
          <section>
            <SectionHeader title={childName ? `Made for ${childName}` : "Made for you"} />
            {madeForChild.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4">
                <div className="text-sm text-muted-foreground">
                  No personalised stories yet — create one in the Magic Hub.
                </div>
                <Link
                  to="/magic-hub"
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft"
                >
                  Go to Magic Hub
                </Link>
              </div>
            ) : (
              <Row stories={madeForChild} />
            )}
          </section>
        )}

        {hasActive && recommended.length > 0 && (
          <section>
            <SectionHeader title={`Recommended for ${childName}`} />
            <Row stories={recommended} emptyVariant="coming-soon" />
          </section>
        )}

        <section>
          <SectionHeader title="All stories" />
          <Row stories={storyRoom} emptyVariant="coming-soon" />
        </section>

      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default HappyPlace;
