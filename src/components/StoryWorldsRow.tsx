import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchUniversesWithCounts } from "@/lib/stories";
import { SectionHeader } from "@/components/SectionHeader";
import { ageDistance } from "@/lib/sortStories";

const PALETTE = [
  {
    bg: "linear-gradient(135deg, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.08) 100%)",
    text: "hsl(var(--primary-deep))",
  },
  {
    bg: "linear-gradient(135deg, hsl(var(--accent) / 0.28) 0%, hsl(var(--accent) / 0.10) 100%)",
    text: "hsl(var(--accent-foreground))",
  },
  {
    bg: "hsl(var(--tag-warm-bg))",
    text: "hsl(var(--tag-warm-fg))",
  },
  {
    bg: "hsl(var(--tag-cool-bg))",
    text: "hsl(var(--tag-cool-fg))",
  },
  {
    bg: "hsl(var(--tag-mint-bg))",
    text: "hsl(var(--tag-mint-fg))",
  },
  {
    bg: "hsl(var(--secondary))",
    text: "hsl(var(--secondary-foreground))",
  },
];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
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
  const paletteIdx = hashString(id + name) % PALETTE.length;
  const { bg, text } = PALETTE[paletteIdx];

  const emoji =
    characterBible && typeof characterBible.emoji === "string"
      ? characterBible.emoji
      : null;
  const initial = emoji ?? name.trim().charAt(0).toUpperCase();

  return (
    <Link
      to={`/universe/${id}`}
      className="flex w-40 flex-shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft transition-colors hover:border-primary/40"
    >
      <div
        className="flex h-24 items-center justify-center overflow-hidden rounded-xl"
        style={{ background: bg }}
      >
        {cover ? (
          <img src={cover} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span
            className="text-2xl font-bold"
            style={{ color: text }}
          >
            {initial}
          </span>
        )}
      </div>
      <div className="line-clamp-1 text-xs font-bold text-foreground">{name}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {count} {count === 1 ? "story" : "stories"}
      </div>
    </Link>
  );
};

export const StoryWorldsRow = () => {
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
      <SectionHeader title="Story Worlds" />
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide">
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
