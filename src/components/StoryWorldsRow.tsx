import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchUniversesWithCounts } from "@/lib/stories";
import { SectionHeader } from "@/components/SectionHeader";
import { ageDistance } from "@/lib/sortStories";

const TINTS = ["#FBEFE2", "#E8F1FB", "#E6F4EC", "#EFEBFB", "#FCE8EC", "#FFF4D6"];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const UniverseCard = ({
  id,
  name,
  count,
  cover,
  characterBible,
}: {
  id: string;
  name: string;
  count: number;
  cover?: string | null;
  characterBible?: Record<string, any> | null;
}) => {
  const tint = TINTS[hashString(id + name) % TINTS.length];
  const initial = name.trim().charAt(0).toUpperCase();
  const age = characterBible?.age;
  return (
    <Link
      to={`/universe/${id}`}
      className="flex w-[128px] flex-shrink-0 flex-col items-center gap-1.5 rounded-[18px] border border-border bg-card px-3 py-4 text-center transition-colors hover:border-primary/40 md:w-auto"
    >
      <span
        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full font-[Quicksand] text-2xl font-bold text-foreground"
        style={{ background: tint }}
      >
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : initial}
      </span>
      <span className="brand-title line-clamp-1 text-foreground">{name}</span>
      <span className="text-xs text-muted-foreground">
        {age ? `Age ${age} · ` : ""}
        {count} {count === 1 ? "story" : "stories"}
      </span>
    </Link>
  );
};

export const StoryWorldsRow = ({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { data: universes = [] } = useQuery({
    queryKey: ["universes-with-counts"],
    queryFn: fetchUniversesWithCounts,
  });

  const childAge = (() => {
    if (typeof window === "undefined") return null;
    const n = parseInt(localStorage.getItem("lulutales_child_age") ?? "", 10);
    return Number.isFinite(n) ? n : null;
  })();

  const sortedUniverses = useMemo(() => {
    return [...universes].sort((a, b) => {
      const aAgeRaw = a.character_bible?.age;
      const bAgeRaw = b.character_bible?.age;
      const aAge = typeof aAgeRaw === "string" ? parseInt(aAgeRaw, 10) : typeof aAgeRaw === "number" ? aAgeRaw : NaN;
      const bAge = typeof bAgeRaw === "string" ? parseInt(bAgeRaw, 10) : typeof bAgeRaw === "number" ? bAgeRaw : NaN;
      const aDist = ageDistance(Number.isFinite(aAge) ? [aAge, aAge] : null, childAge);
      const bDist = ageDistance(Number.isFinite(bAge) ? [bAge, bAge] : null, childAge);
      if (aDist !== bDist) return aDist - bDist;
      const ad = a.created_at ?? "";
      const bd = b.created_at ?? "";
      return bd.localeCompare(ad);
    });
  }, [universes, childAge]);

  if (universes.length === 0) return null;

  return (
    <section>
      {!hideHeader && <SectionHeader title="Story worlds" />}
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-6">
        {sortedUniverses.map((u) => (
          <UniverseCard
            key={u.id}
            id={u.id}
            name={u.display_name}
            count={u.story_count}
            cover={u.cover_image}
            characterBible={u.character_bible}
          />
        ))}
      </div>
    </section>
  );
};
