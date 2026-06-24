import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchUniversesWithCounts } from "@/lib/stories";
import { SectionHeader } from "@/components/SectionHeader";

const UniverseCard = ({
  id,
  name,
  count,
  cover,
}: {
  id: string;
  name: string;
  count: number;
  cover?: string | null;
}) => (
  <Link
    to={`/universe/${id}`}
    className="flex w-40 flex-shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft transition-colors hover:border-primary/40"
  >
    <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
      {cover ? (
        <img src={cover} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-4xl">🌌</span>
      )}
    </div>
    <div className="line-clamp-1 text-xs font-bold text-foreground">{name}</div>
    <div className="text-[10px] font-semibold text-muted-foreground">
      {count} {count === 1 ? "story" : "stories"}
    </div>
  </Link>
);

export const StoryWorldsRow = () => {
  const { data: universes = [] } = useQuery({
    queryKey: ["universes-with-counts"],
    queryFn: fetchUniversesWithCounts,
  });

  if (universes.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Story Worlds" />
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide">
        {universes.map((u) => (
          <UniverseCard
            key={u.id}
            id={u.id}
            name={u.display_name}
            count={u.story_count}
            cover={u.cover_image}
          />
        ))}
      </div>
    </section>
  );
};
