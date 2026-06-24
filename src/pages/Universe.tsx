import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchStoriesByUniverse, fetchUniverse } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { StoryCard } from "@/components/StoryCard";

const Universe = () => {
  const { id = "" } = useParams();

  const { data: universe } = useQuery({
    queryKey: ["universe", id],
    queryFn: () => fetchUniverse(id),
    enabled: !!id,
  });

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories-by-universe", id],
    queryFn: () => fetchStoriesByUniverse(id),
    enabled: !!id,
  });

  const title = universe?.display_name ?? "Story World";

  return (
    <PhoneShell>
      <PageHeader title={title} subtitle={universe?.description ?? undefined} />
      <main className="flex-1 overflow-y-auto px-5 pb-6">
        {universe?.cover_image && (
          <div className="mb-4 overflow-hidden rounded-2xl">
            <img src={universe.cover_image} alt={title} className="h-40 w-full object-cover" />
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Loading…</div>
        ) : stories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            No stories in this world yet.
            <div className="mt-3">
              <Link to="/happy-place" className="text-xs font-bold text-primary-deep">
                ← Back to Happy Place
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} universeName={title} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </PhoneShell>
  );
};

export default Universe;
