import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Play } from "lucide-react";
import { fetchStoriesByUniverse, fetchUniverse } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { StoryCard } from "@/components/StoryCard";
import { skillKeyFor } from "@/components/SkillPicture";
import { SKILL_ART } from "@/lib/skillArt";
import { isRenderable } from "@/lib/storyStatus";

const Universe = () => {
  const { id = "" } = useParams();
  const nav = useNavigate();

  const { data: universe } = useQuery({
    queryKey: ["universe", id],
    queryFn: () => fetchUniverse(id),
    enabled: !!id,
  });

  const { data: rawStories = [], isLoading } = useQuery({
    queryKey: ["stories-by-universe", id],
    queryFn: () => fetchStoriesByUniverse(id),
    enabled: !!id,
  });
  const stories = useMemo(
    () => rawStories.filter(isRenderable).sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")),
    [rawStories]
  );

  const name = universe?.display_name ?? "Story world";
  const bible = (universe?.character_bible ?? {}) as Record<string, any>;
  const skills = useMemo(() => {
    const seen: string[] = [];
    for (const s of stories) {
      const n = SKILL_ART[skillKeyFor(s as any)]?.name;
      if (n && !seen.includes(n)) seen.push(n);
    }
    return seen.slice(0, 3);
  }, [stories]);

  const chips = [
    bible.age ? `Age ${bible.age}` : null,
    stories.length ? `${stories.length} ${stories.length === 1 ? "story" : "stories"}` : null,
    skills.length ? skills.join(", ") : null,
  ].filter(Boolean) as string[];

  const first = stories[0];
  const playFirst = () => {
    if (!first) return;
    nav(first.story_type === "bedtime_text" ? `/bedtime/${first.id}` : `/story/${first.id}`);
  };

  return (
    <PhoneShell withNav>
      <main className="flex-1 overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12">
        <section className="bg-accent px-5 pb-6 pt-3 md:rounded-b-[28px] md:px-10 md:pt-8">
          <Link to="/library" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-foreground">
            <ChevronLeft className="h-4 w-4" /> Library
          </Link>
          <div className="mt-2 flex items-center gap-4">
            <span className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-card font-[Quicksand] text-3xl font-bold text-foreground">
              {universe?.cover_image ? (
                <img src={universe.cover_image} alt="" className="h-full w-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Story world</div>
              <h1 className="font-[Quicksand] text-[28px] font-bold leading-tight text-foreground">{name}</h1>
            </div>
          </div>
          {universe?.description && (
            <p className="mt-3 max-w-[560px] text-[15px] text-foreground/80">{universe.description}</p>
          )}
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span key={c} className="inline-flex min-h-7 items-center rounded-full bg-card px-3 text-[13px] font-semibold text-foreground">
                  {c}
                </span>
              ))}
            </div>
          )}
          {first && (
            <button
              type="button"
              onClick={playFirst}
              className="mt-4 inline-flex items-center gap-2 bg-primary px-6 text-primary-foreground"
            >
              <Play className="h-4 w-4 fill-current" /> Play all from the start
            </button>
          )}
        </section>

        <section className="px-5 pt-6 md:px-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-[Quicksand] text-[19px] font-bold text-foreground">{name}’s stories</h2>
            <span className="text-sm text-muted-foreground">In order</span>
          </div>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : stories.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
              No stories in this world yet.
            </div>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2">
              {stories.map((s) => (
                <StoryCard key={s.id} story={s} variant="row" />
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </PhoneShell>
  );
};

export default Universe;
