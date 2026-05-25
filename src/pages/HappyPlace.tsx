import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { fetchStories, fetchStoriesForProfile, type Story } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { SectionHeader } from "@/components/SectionHeader";
import { ProfileAvatarButton } from "@/components/ProfileAvatarButton";
import { TagChip } from "@/components/TagChip";

type CardVisual = "sparkle" | "moon" | "headphones";

const visualFor = (v: CardVisual) =>
  v === "sparkle" ? "✨" : v === "moon" ? "🌙" : "🎧";

const StoryRowCard = ({
  story,
  visual,
  to,
}: {
  story: Story;
  visual: CardVisual;
  to: string;
}) => (
  <Link
    to={to}
    state={{ from: "/happy-place" }}
    className="flex w-44 flex-shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft transition-colors hover:border-primary/40"
  >
    <div className="flex h-20 items-center justify-center rounded-xl bg-gradient-card text-4xl">
      {visualFor(visual)}
    </div>
    {story.theme && <TagChip label={story.theme} />}
    <div className="line-clamp-2 text-xs font-bold leading-snug text-foreground">
      {story.title}
    </div>
  </Link>
);

const EmptyCard = () => (
  <div className="ml-5 flex h-32 w-44 flex-shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 text-center text-[11px] font-semibold text-muted-foreground">
    Coming soon
  </div>
);

const Row = ({
  stories,
  visual,
  linkFor,
}: {
  stories: Story[];
  visual: CardVisual;
  linkFor: (s: Story) => string;
}) => {
  if (stories.length === 0) return <EmptyCard />;
  return (
    <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide">
      {stories.map((s) => (
        <StoryRowCard key={s.id} story={s} visual={visual} to={linkFor(s)} />
      ))}
    </div>
  );
};

const HappyPlace = () => {
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;
  const childName = localStorage.getItem("lulutales_child_name") ?? "friend";

  const { data: allStories = [] } = useQuery({ queryKey: ["stories"], queryFn: fetchStories });
  const { data: profileStories = [] } = useQuery({
    queryKey: ["stories-for-profile", profileId],
    queryFn: () => (profileId ? fetchStoriesForProfile(profileId) : Promise.resolve([])),
    enabled: !!profileId,
  });

  const [query, setQuery] = useState("");
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

  const personalised = useMemo(
    () => profileStories
      .filter((s) => s.is_generated === true && s.story_type === "personalised_audio" && !isFailed(s))
      .filter(matches),
    [profileStories, query]
  );
  const bedtime = useMemo(
    () => profileStories
      .filter(
        (s) =>
          s.is_generated === true &&
          s.story_type === "bedtime_text" &&
          !isFailed(s) &&
          !!s.story_text &&
          s.story_text.trim().length > 0
      )
      .filter(matches),
    [profileStories, query]
  );
  const storyRoom = useMemo(
    () => allStories.filter((s) => s.story_type === "pre_recorded" && s.owner_profile_id === null).filter(matches),
    [allStories, query]
  );

  return (
    <PhoneShell>
      <header className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <ProfileAvatarButton />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-primary-deep">For {childName}</div>
            <h1 className="text-2xl font-extrabold text-foreground">My Happy Place</h1>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-6 space-y-6">
        <section>
          <SectionHeader title={`Curated for ${childName}`} />
          <Row stories={personalised} visual="sparkle" linkFor={(s) => `/story/${s.id}`} />
        </section>

        <section>
          <SectionHeader title="Bedtime Stories" />
          <Row stories={bedtime} visual="moon" linkFor={(s) => `/bedtime/${s.id}`} />
        </section>

        <section>
          <SectionHeader title="Story Room" />
          <Row stories={storyRoom} visual="headphones" linkFor={(s) => `/story/${s.id}`} />
        </section>
      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default HappyPlace;
