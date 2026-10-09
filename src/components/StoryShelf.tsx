import { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Story } from "@/lib/stories";
import { StoryCard } from "@/components/StoryCard";

/**
 * A titled shelf of story cards.
 * Phones: one swipeable row. Computers: a tidy grid.
 */
export const StoryShelf = ({
  title,
  seeAllTo,
  stories,
  nameFor,
  note,
  empty,
}: {
  title: ReactNode;
  seeAllTo?: string;
  stories: Story[];
  nameFor?: (s: Story) => string | null;
  note?: ReactNode;
  empty?: ReactNode;
}) => {
  if (stories.length === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-[Quicksand] text-[19px] font-bold text-foreground">{title}</h2>
        {seeAllTo && stories.length > 0 && (
          <Link to={seeAllTo} className="shrink-0 text-sm font-semibold text-primary">
            See all
          </Link>
        )}
      </div>
      {note && <p className="-mt-1.5 text-sm text-muted-foreground">{note}</p>}
      {stories.length === 0 ? (
        empty
      ) : (
        <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4">
          {stories.map((s) => (
            <div key={s.id} className="w-[150px] flex-shrink-0 md:w-auto">
              <StoryCard story={s} universeName={nameFor?.(s) ?? null} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default StoryShelf;
