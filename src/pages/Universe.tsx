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

  const bible = (universe?.character_bible ?? {}) as Record<string, any>;
  const aboutFields: { label: string; value: any }[] = [
    { label: "Age", value: bible.age },
    { label: "Personality", value: bible.personality },
    { label: "Family", value: bible.family_structure },
    { label: "City", value: bible.city },
  ].filter((f) => {
    if (f.value == null) return false;
    if (typeof f.value === "string") return f.value.trim() !== "";
    if (Array.isArray(f.value)) return f.value.length > 0;
    return true;
  });

  const renderValue = (v: any) =>
    Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);

  return (
    <PhoneShell>
      <PageHeader title={title} subtitle={universe?.description ?? undefined} />
      <main className="flex-1 overflow-y-auto px-5 pb-6">
        {universe?.cover_image && (
          <div className="mb-4 overflow-hidden rounded-2xl">
            <img src={universe.cover_image} alt={title} className="h-40 w-full object-cover" />
          </div>
        )}
        {aboutFields.length > 0 && (
          <section className="mb-5 rounded-2xl border border-border bg-card/60 p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary-deep">
              About
            </h2>
            <dl className="space-y-2 text-sm">
              {aboutFields.map((f) => (
                <div key={f.label} className="flex gap-2">
                  <dt className="min-w-20 font-semibold text-foreground">{f.label}</dt>
                  <dd className="text-muted-foreground">{renderValue(f.value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Loading…</div>
        ) : stories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            No stories in this world yet.
            <div className="mt-3">
              <Link to="/happy-place" className="text-xs font-bold text-primary-deep">
                ← Back to Story Worlds
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
