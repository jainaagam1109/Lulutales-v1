import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, ChevronDown, ChevronUp, Check } from "lucide-react";
import { fetchStories, fetchStoriesForProfile, fetchUniverses, fetchSavedStories, fetchPlayCounts, type Story, type Universe } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { SectionHeader } from "@/components/SectionHeader";
import { PageHeader } from "@/components/PageHeader";
import { TagChip } from "@/components/TagChip";
import { StoryCard } from "@/components/StoryCard";
import { StoryWorldsRow } from "@/components/StoryWorldsRow";
import { getStoryStatus } from "@/lib/storyStatus";
import { fetchCompletedThemes } from "@/lib/analytics";
import { sortStories } from "@/lib/sortStories";

type MadeForFormat = "all" | "audio" | "text" | "saved";

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
      <div className="line-clamp-2 min-h-[2.25rem] text-xs font-bold leading-snug text-foreground">
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
  const location = useLocation();
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;
  const childName = localStorage.getItem("lulutales_child_name");
  const hasActive = !!profileId;
  const pageTitle = childName && hasActive ? `${childName}'s Happy Place` : "The Happy Place";
  const curatedTitle = childName && hasActive ? `Personalised audio for ${childName}` : "Personalised audio stories";

  useEffect(() => {
    if (location.hash !== "#recommended") return;
    const t = setTimeout(() => {
      const el = document.getElementById("recommended");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(t);
  }, [location.hash]);

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
  const { data: savedStories = [] } = useQuery({
    queryKey: ["saved-stories", profileId],
    queryFn: fetchSavedStories,
    enabled: !!profileId,
  });
  const { data: playCounts = new Map<string, number>() } = useQuery({
    queryKey: ["story-play-counts"],
    queryFn: fetchPlayCounts,
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

  const [madeForFormat, setMadeForFormat] = useState<MadeForFormat>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

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

  const storyRoomSorted = useMemo(
    () => sortStories(storyRoom, { childAge, playCounts, completedThemes }),
    [storyRoom, childAge, playCounts, completedThemes]
  );

  const madeForChild = useMemo(() => {
    if (madeForFormat === "saved") {
      return [...savedStories].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    }
    const merged: Story[] = [];
    if (madeForFormat === "all" || madeForFormat === "audio") merged.push(...personalised);
    if (madeForFormat === "all" || madeForFormat === "text") merged.push(...bedtime);
    return merged.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }, [personalised, bedtime, madeForFormat, savedStories]);

  const madeForCounts = {
    all: personalised.length + bedtime.length,
    audio: personalised.length,
    text: bedtime.length,
    saved: savedStories.length,
  };

  const formatLabels: Record<MadeForFormat, string> = {
    all: "All",
    audio: "Listen",
    text: "Read",
    saved: "Saved",
  };

  const recommended = useMemo(() => {
    const list = storyRoom.filter((s) => {
      const featured = !!s.is_featured;
      const parsed = s.age_group ? parseInt(String(s.age_group).match(/\d+/)?.[0] ?? "", 10) : NaN;
      if (!Number.isFinite(parsed)) return featured;
      if (childAge == null) return featured;
      return featured || Math.abs(parsed - childAge) <= 1;
    });
    return sortStories(list, { childAge, playCounts, completedThemes });
  }, [storyRoom, childAge, playCounts, completedThemes]);


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
      </PageHeader>


      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] space-y-6">
        {savedStories.length > 0 && (
          <section>
            <SectionHeader title="Favorites" />
            <Row stories={savedStories} universesMap={universesMap} />
          </section>
        )}
        {hasActive && (
          <section>
            <div className="relative mb-2 flex items-center justify-between px-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {childName ? `Made for ${childName}` : "Made for you"}
              </h2>
              <button
                ref={triggerRef}
                type="button"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                  menuOpen || madeForFormat !== "all"
                    ? "border-primary/40 bg-primary/10 text-primary-deep"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <span>{formatLabels[madeForFormat]}</span>
                {menuOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  role="menu"
                  className="absolute right-5 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                >
                  {(["all", "audio", "text", "saved"] as MadeForFormat[]).map((opt) => {
                    const selected = madeForFormat === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="menuitem"
                        tabIndex={0}
                        onClick={() => {
                          setMadeForFormat(opt);
                          setMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-muted ${
                          selected ? "text-primary-deep" : "text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {selected ? <Check className="h-3.5 w-3.5" /> : <span className="inline-block w-3.5" />}
                          <span>{formatLabels[opt]}</span>
                        </span>
                        <span className="text-muted-foreground">{madeForCounts[opt]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {madeForChild.length === 0 ? (
              madeForFormat === "saved" ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">
                  No saved stories yet — tap the bookmark on any story to keep it here.
                </div>
              ) : (
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
              )
            ) : (
              <Row stories={madeForChild} universesMap={universesMap} />
            )}
          </section>
        )}
        {recommended.length > 0 && (
          <section id="recommended" className="scroll-mt-4">
            <SectionHeader title={childName ? `Recommended for ${childName}` : "Recommended for you"} />
            <Row stories={recommended} universesMap={universesMap} />
          </section>
        )}
        <StoryWorldsRow />

        <section>
          <SectionHeader title="All stories" />
          <Row stories={storyRoomSorted} emptyVariant="coming-soon" universesMap={universesMap} />
        </section>


      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default HappyPlace;
