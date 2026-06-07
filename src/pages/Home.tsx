import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchStories } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { StoryCard } from "@/components/StoryCard";
import { StoryCardSkeleton } from "@/components/StoryCardSkeleton";
import { SectionHeader } from "@/components/SectionHeader";
import { PageHeader } from "@/components/PageHeader";

const Home = () => {
  const childName = localStorage.getItem("lulutales_child_name") ?? "friend";
  const { data: stories = [], isLoading } = useQuery({ queryKey: ["stories"], queryFn: fetchStories });
  const [query, setQuery] = useState("");
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const themes = useMemo(() => {
    const set = new Set<string>();
    stories.forEach((s) => s.theme && set.add(s.theme));
    return Array.from(set);
  }, [stories]);

  const filtered = useMemo(() => {
    return stories.filter((s) => {
      const matchesQ = !query || s.title.toLowerCase().includes(query.toLowerCase());
      const matchesT = !activeTheme || s.theme === activeTheme;
      return matchesQ && matchesT;
    });
  }, [stories, query, activeTheme]);

  const featured = filtered.filter((s) => s.is_featured);
  const ongoing = stories[0];

  return (
    <PhoneShell>
      <PageHeader
        showBack={false}
        eyebrow={`Hi ${childName} 👋`}
        title="Story time"
      >
        <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {themes.length > 0 && (
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveTheme(null)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                !activeTheme
                  ? "border-primary bg-gradient-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              All
            </button>
            {themes.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTheme(t)}
                className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                  activeTheme === t
                    ? "border-primary bg-gradient-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </PageHeader>

      <main className="flex-1 overflow-y-auto pb-6">
        {isLoading && (
          <section className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <StoryCardSkeleton key={i} />
              ))}
            </div>
          </section>
        )}

        {!isLoading && ongoing && !query && !activeTheme && (
          <section className="px-5 pb-5">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Continue listening
            </h2>
            <StoryCard story={ongoing} variant="row" />
          </section>
        )}

        {!isLoading && featured.length > 0 && (
          <section className="pb-5">
            <SectionHeader title="Recommended for you" seeAllTo="/library" />
            <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
              {featured.map((s) => (
                <div key={s.id} className="w-40 flex-shrink-0">
                  <StoryCard story={s} />
                </div>
              ))}
            </div>
          </section>
        )}

        {!isLoading && (
          <section>
            <SectionHeader title="All stories" />
            <div className="grid grid-cols-2 gap-3 px-5">
              {filtered.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="px-5 pt-4 text-center text-xs text-muted-foreground">No stories match your search.</p>
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default Home;
