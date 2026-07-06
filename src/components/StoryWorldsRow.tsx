import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchUniversesWithCounts } from "@/lib/stories";
import { SectionHeader } from "@/components/SectionHeader";
import { ageDistance } from "@/lib/sortStories";

const PALETTE = [
  { bg: "linear-gradient(135deg, #FFD7A8 0%, #FFB066 100%)", text: "#7A3B00" },
  { bg: "linear-gradient(135deg, #C7E9FF 0%, #6FB9F0 100%)", text: "#0B3C66" },
  { bg: "linear-gradient(135deg, #D6F5DC 0%, #7FCE94 100%)", text: "#0E4A22" },
  { bg: "linear-gradient(135deg, #FFD1E1 0%, #F26AA0 100%)", text: "#5B0E33" },
  { bg: "linear-gradient(135deg, #E2D6FF 0%, #9B7BE8 100%)", text: "#2E1466" },
  { bg: "linear-gradient(135deg, #FFF1A8 0%, #F2C84B 100%)", text: "#5A3D00" },
  { bg: "linear-gradient(135deg, #B8F1EA 0%, #2DB6A6 100%)", text: "#0B3E39" },
  { bg: "linear-gradient(135deg, #F5C7B8 0%, #D9745A 100%)", text: "#5A1B0A" },
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
      <div className="text-[10px] font-semibold text-muted-foreground">
        {count} {count === 1 ? "story" : "stories"}
      </div>
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
      {!hideHeader && <SectionHeader title="Story Worlds" />}
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
