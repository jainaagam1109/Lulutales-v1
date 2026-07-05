import { useEffect, useQuery as _unused, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { InsightsSummary } from "@/components/InsightsSummary";
import { supabase } from "@/integrations/supabase/client";
import { pronounsFor } from "@/lib/pronouns";

import { fetchBucketBreakdown } from "@/lib/analytics";

const Insights = () => {
  const childName = localStorage.getItem("lulutales_child_name") ?? "your child";
  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;

  const { data: bucketBars = [] } = useQuery({
    queryKey: ["analytics-bucket-breakdown", profileId],
    queryFn: () => fetchBucketBreakdown(profileId!),
    enabled: !!profileId,
  });

  const [exploringInfoOpen, setExploringInfoOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!exploringInfoOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setExploringInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [exploringInfoOpen]);

  return (
    <PhoneShell>
      <PageHeader title={`What ${childName} learned`} />

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] space-y-5">
        <InsightsSummary profileId={profileId} variant="plain" childName={childName} />

        <section>
          <div className="flex items-center gap-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              What {childName} has been exploring
            </h2>
            <span ref={wrapRef} className="relative inline-flex">
              <button
                type="button"
                aria-label="About exploring"
                aria-expanded={exploringInfoOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setExploringInfoOpen((v) => !v);
                }}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-primary-deep"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {exploringInfoOpen && (
                <span
                  role="tooltip"
                  className={cn(
                    "absolute left-0 top-full z-40 mt-1 w-64 rounded-xl border border-border bg-card p-2.5 text-left text-[11px] leading-snug text-foreground shadow-lg"
                  )}
                >
                  The life skills {childName}'s recent stories lean toward, based on what she's
                  finished listening to. Longer bars mean more stories in that area — not
                  "better" or "done".
                </span>
              )}
            </span>
          </div>
          <p className="mb-3 mt-1 text-[11px] text-muted-foreground">
            Based on stories completed — each story builds a life skill.
          </p>
          {bucketBars.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Once {childName} completes a few stories, their growth areas will show up here ✨
            </p>
          ) : (
            <div className="space-y-3">
              {bucketBars.map((b) => (
                <div key={b.bucket}>
                  <div className="mb-1 text-xs font-bold text-foreground">{b.bucket}</div>
                  <div className="mb-1 text-[11px] text-muted-foreground">
                    {b.storyCount} {b.storyCount === 1 ? "story" : "stories"}
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-primary"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </PhoneShell>
  );
};

export default Insights;
