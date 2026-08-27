import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Lock, Headphones, Moon, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { fetchStoriesForProfile } from "@/lib/stories";

const MagicHub = () => {
  const nav = useNavigate();
  const profileId = typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;
  const childName = typeof window !== "undefined" ? localStorage.getItem("lulutales_child_name") : null;

  const { data: stories = [] } = useQuery({
    queryKey: ["stories-for-profile", profileId],
    queryFn: () => (profileId ? fetchStoriesForProfile(profileId) : Promise.resolve([])),
    enabled: !!profileId,
  });

  const hasGenerated = useMemo(() => stories.some((s) => s.is_generated), [stories]);

  const goPersonalised = (path: string) => {
    if (!profileId) {
      nav(`/onboarding?next=${encodeURIComponent(path)}`);
      return;
    }
    nav(path);
  };

  const cards = [
    {
      sectionLabel: "Listen",
      title: "Generate audio story",
      desc: "Narrated aloud for your child to listen and enjoy on their own.",
      formatHint: "🎧 Press play — no reading needed · ~5–15 min",
      emoji: "🎙",
      iconBg: "bg-tag-warm-bg text-tag-warm-fg",
      tag: "Beta",
      tagClass: "bg-tag-warm-bg text-tag-warm-fg border-tag-warm-border",
      onClick: () => goPersonalised("/magic-hub/audio"),
      disabled: false,
    },
    {
      sectionLabel: "Read",
      title: "Generate text story",
      desc: "You read this one aloud to your child from the screen — made for bedtime.",
      formatHint: "📖 You read it from the screen · ~3–10 min",
      emoji: "📖",
      iconBg: "bg-tag-mint-bg text-tag-mint-fg",
      tag: "Beta",
      tagClass: "bg-tag-mint-bg text-tag-mint-fg border-tag-mint-border",
      onClick: () => goPersonalised("/magic-hub/bedtime"),
      disabled: false,
    },
    {
      sectionLabel: "Coming soon",
      title: "Personalised story book",
      desc: "Printed keepsake delivered to your door",
      formatHint: "",
      emoji: "",
      iconBg: "bg-muted text-muted-foreground",
      tag: "Coming soon",
      tagClass: "bg-muted text-muted-foreground border-border",
      onClick: () => {},
      disabled: true,
    },
  ];

  return (
    <PhoneShell>
      <PageHeader
        backTo="/"
        title="Magic Hub"
        subtitle={!hasGenerated ? "✨ Tap below to create your first story" : undefined}
      />

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {childName && (
          <p className="mb-3 text-[11px] text-muted-foreground">
            Made just for {childName} — only visible on this profile.
          </p>
        )}
        <div className="space-y-3">
          {cards.map(({ sectionLabel, title, desc, formatHint, emoji, iconBg, tag, tagClass, onClick, disabled }) => (
            <div key={title}>
              <div className="mb-2 text-[10px] font-semibold text-muted-foreground">
                {sectionLabel}
              </div>
              <button
                onClick={onClick}
                disabled={disabled}
                className={`flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors ${
                  disabled ? "opacity-50" : "hover:border-primary"
                }`}
              >
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${iconBg} text-2xl`}>
                  {emoji ? emoji : <Lock className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-extrabold text-foreground">{title}</div>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${tagClass}`}>
                      {tag}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
                  {formatHint && (
                    <div className="mt-1 text-[10px] text-muted-foreground">{formatHint}</div>
                  )}
                  {disabled && (
                    <div className="mt-1 text-[10px] text-muted-foreground">Notify me</div>
                  )}
                </div>
                {!disabled ? (
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                ) : (
                  <Lock className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
        </div>
      </main>


      <BottomNav />
    </PhoneShell>
  );
};

export default MagicHub;
