import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchStories, fetchStoriesForProfile, fetchUniverses, fetchSavedStories, fetchPlayCounts, type Story } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { SectionHeader } from "@/components/SectionHeader";
import { ProfileSwitcherChip } from "@/components/ProfileAvatarButton";
import { StoryCard, storyLanguage } from "@/components/StoryCard";
import { StoryShelf } from "@/components/StoryShelf";
import { StoryWorldsRow } from "@/components/StoryWorldsRow";
import { MakeStoryCard } from "@/components/MakeStoryCard";
import { getStoryStatus, isRenderable } from "@/lib/storyStatus";
import { fetchCompletedThemes } from "@/lib/analytics";
import { sortStories } from "@/lib/sortStories";
import { BUCKETS, SKILL_ORDER, type BucketKey } from "@/lib/themeCatalog";
import { useFamily } from "@/lib/family";

type MadeForFormat = "all" | "audio" | "text" | "saved";

/** Small rounded filter chip. */
const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`inline-flex min-h-9 flex-shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors ${
      on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-primary/40"
    }`}
  >
    {children}
  </button>
);

const selectCls =
  "min-h-9 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground focus:border-primary focus:outline-none";

const HappyPlace = ({ view }: { view: "library" | "mine" }) => {
  const location = useLocation();
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;
  const childName = localStorage.getItem("lulutales_child_name");
  const hasActive = !!profileId;
  const pageTitle = view === "library" ? "Library" : "My stories";
  const fam = useFamily();

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

  // Only show stories that will actually render as a card.
  const visible = (s: Story) => {
    const status = getStoryStatus(s);
    if (status === "ready") return !isFailed(s);
    if (status === "preparing") return true;
    return false; // stale / lang_age_failed are hidden entirely
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

  const [allAgeFilter, setAllAgeFilter] = useState<string>("");
  const [allBucketFilter, setAllBucketFilter] = useState<BucketKey | "">("");
  const [allLanguageFilter, setAllLanguageFilter] = useState<"" | "english" | "hindi">("");

  const allAgeOptions = useMemo(() => {
    const s = new Set<string>();
    storyRoom.forEach((x) => x.age_group && s.add(String(x.age_group)));
    return Array.from(s).sort();
  }, [storyRoom]);

  const storyRoomFiltered = useMemo(
    () =>
      storyRoom.filter(
        (s) =>
          (!allAgeFilter || String(s.age_group ?? "") === allAgeFilter) &&
          (!allBucketFilter || s.bucket_key === allBucketFilter) &&
          (!allLanguageFilter || storyLanguage(s) === allLanguageFilter)
      ),
    [storyRoom, allAgeFilter, allBucketFilter, allLanguageFilter]
  );

  const storyRoomSorted = useMemo(
    () => sortStories(storyRoomFiltered, { childAge, playCounts, completedThemes }),
    [storyRoomFiltered, childAge, playCounts, completedThemes]
  );

  const savedVisible = useMemo(() => savedStories.filter(isRenderable), [savedStories]);

  const madeForChild = useMemo(() => {
    if (madeForFormat === "saved") {
      return [...savedVisible].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    }
    const merged: Story[] = [];
    if (madeForFormat === "all" || madeForFormat === "audio") merged.push(...personalised);
    if (madeForFormat === "all" || madeForFormat === "text") merged.push(...bedtime);
    return merged.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }, [personalised, bedtime, madeForFormat, savedVisible]);

  const madeForCounts = {
    all: personalised.length + bedtime.length,
    audio: personalised.length,
    text: bedtime.length,
    saved: savedVisible.length,
  };

  const formatLabels: Record<MadeForFormat, string> = {
    all: "All",
    audio: "Listen",
    text: "Read aloud",
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


  const savedNotMine = savedVisible.filter((s) => s.story_type === "pre_recorded");
  const name = childName || "your child";
  const waiting = fam.status === "waiting";

  return (
    <PhoneShell withNav>
      <header className="px-5 pb-2 pt-3 md:px-10 md:pt-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-[Quicksand] text-[26px] font-bold text-foreground md:text-[32px]">{pageTitle}</h1>
          <div className="md:hidden">
            <ProfileSwitcherChip />
          </div>
        </div>
        {view === "library" && (
          <label className="mt-3 flex min-h-12 items-center gap-2.5 rounded-full border border-border bg-card px-4 md:max-w-[480px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stories"
              aria-label="Search stories"
              className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>
        )}
      </header>

      <main className="flex-1 space-y-7 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2 md:px-10 md:pb-12">
        {view === "mine" && (
          <>
            <div className="md:max-w-[560px]">
              <MakeStoryCard childName={childName} hasChild={hasActive} size="strip" />
            </div>

            {hasActive && (waiting && madeForCounts.all === 0 ? null : (
              <section>
                <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 scrollbar-hide md:mx-0 md:px-0">
                  {(["all", "audio", "text", "saved"] as MadeForFormat[]).map((opt) => (
                    <Chip key={opt} on={madeForFormat === opt} onClick={() => setMadeForFormat(opt)}>
                      {formatLabels[opt]}
                      {madeForCounts[opt] > 0 && <span className="ml-1.5 opacity-60">{madeForCounts[opt]}</span>}
                    </Chip>
                  ))}
                </div>
                {madeForChild.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-border bg-card/60 p-5 text-sm text-muted-foreground">
                    {madeForFormat === "saved"
                      ? "Nothing saved yet. Tap the heart on any story to keep it here."
                      : `${childName ? `${childName}’s` : "Your child’s"} stories will live here once you make one.`}
                  </div>
                ) : (
                  <div className="grid gap-2.5 md:grid-cols-2">
                    {madeForChild.map((s) => (
                      <StoryCard key={s.id} story={s} variant="row" universeName={universesMap.get((s as any).universe_id) ?? null} />
                    ))}
                  </div>
                )}
              </section>
            ))}

            {waiting && madeForCounts.all === 0 && (
              <div className="rounded-[18px] border border-dashed border-border bg-card/60 p-5">
                <div className="brand-title text-foreground">{childName ? `${childName}’s` : "Your child’s"} own stories will live here</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  While you wait, tap the heart on any library story to save it here.
                </p>
              </div>
            )}

            {madeForFormat !== "saved" && (
              <StoryShelf
                title="Saved from the library"
                stories={savedNotMine}
                nameFor={(s) => universesMap.get((s as any).universe_id) ?? null}
              />
            )}
          </>
        )}

        {view === "library" && !query && recommended.length > 0 && (
          <div id="recommended" className="scroll-mt-4">
            <StoryShelf
              title={`Picked for ${name}`}
              stories={recommended.slice(0, 8)}
              nameFor={(s) => universesMap.get((s as any).universe_id) ?? null}
            />
          </div>
        )}

        {view === "library" && !query && (
          <section>
            <SectionHeader title="Story worlds" subtitle="Meet the LuluTales children. Each has their own set of stories." />
            <StoryWorldsRow hideHeader />
          </section>
        )}

        {view === "library" && (
          <section>
            <SectionHeader
              title={query ? "Results" : "All stories"}
              right={<span className="shrink-0 text-sm text-muted-foreground">{storyRoomSorted.length} stories</span>}
            />
            <div className="-mx-5 mb-2.5 flex gap-2 overflow-x-auto px-5 scrollbar-hide md:mx-0 md:flex-wrap md:px-0">
              <Chip on={!allBucketFilter} onClick={() => setAllBucketFilter("")}>All skills</Chip>
              {SKILL_ORDER.map((k) => (
                <Chip key={k} on={allBucketFilter === k} onClick={() => setAllBucketFilter(allBucketFilter === k ? "" : k)}>
                  {BUCKETS[k].cardName}
                </Chip>
              ))}
            </div>
            <div className="mb-3.5 flex gap-2">
              <select value={allAgeFilter} onChange={(e) => setAllAgeFilter(e.target.value)} aria-label="Filter by age" className={selectCls}>
                <option value="">Any age</option>
                {allAgeOptions.map((a) => (
                  <option key={a} value={a}>{/^\d+$/.test(a) ? `Age ${a}` : a}</option>
                ))}
              </select>
              <select
                value={allLanguageFilter}
                onChange={(e) => setAllLanguageFilter(e.target.value as "" | "english" | "hindi")}
                aria-label="Filter by language"
                className={selectCls}
              >
                <option value="">Any language</option>
                <option value="english">English</option>
                <option value="hindi">हिंदी</option>
              </select>
            </div>
            {storyRoomSorted.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
                No stories match. Try another skill or age.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {storyRoomSorted.map((s) => (
                  <StoryCard key={s.id} story={s} universeName={universesMap.get((s as any).universe_id) ?? null} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default HappyPlace;
