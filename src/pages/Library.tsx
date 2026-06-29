import { useQuery } from "@tanstack/react-query";
import { fetchSavedStories } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { StoryCard } from "@/components/StoryCard";
import { StoryCardSkeleton } from "@/components/StoryCardSkeleton";
import { PageHeader } from "@/components/PageHeader";

const Library = () => {
  const { data: stories = [], isLoading } = useQuery({ queryKey: ["library"], queryFn: fetchSavedStories });

  return (
    <PhoneShell>
      <PageHeader showBack={false} title="Library" subtitle="Your saved stories" />
      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <StoryCardSkeleton key={i} />
            ))}
          </div>
        )}
        {!isLoading && stories.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No saved stories yet. Tap the bookmark on any story to save it.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      </main>
      <BottomNav />
    </PhoneShell>
  );
};

export default Library;
