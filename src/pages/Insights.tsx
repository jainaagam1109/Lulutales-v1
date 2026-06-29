import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { InsightsSummary } from "@/components/InsightsSummary";

import {
  fetchScreenTimeSeconds,
  fetchBucketBreakdown,
} from "@/lib/analytics";

const fmtMinutes = (seconds: number): string => {
  if (!seconds) return "0 min";
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min === 0 ? `${hr} hr` : `${hr}h ${min}m`;
};

const Insights = () => {
  const childName = localStorage.getItem("lulutales_child_name") ?? "your child";
  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;

  const { data: screenTimeSec = 0 } = useQuery({
    queryKey: ["analytics-screen-time", profileId],
    queryFn: () => fetchScreenTimeSeconds(profileId!),
    enabled: !!profileId,
  });

  const { data: bucketBars = [] } = useQuery({
    queryKey: ["analytics-bucket-breakdown", profileId],
    queryFn: () => fetchBucketBreakdown(profileId!),
    enabled: !!profileId,
  });

  return (
    <PhoneShell>
      <PageHeader title={`What ${childName} learned`} />

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] space-y-5">
        <InsightsSummary profileId={profileId} variant="plain" />

        <section className="rounded-2xl border border-border bg-card p-3 shadow-soft">
          <Clock className="h-5 w-5 text-primary-deep" />
          <div className="mt-2 text-lg font-extrabold text-foreground">
            {fmtMinutes(screenTimeSec)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Screen time saved <span className="normal-case tracking-normal">(est.)</span>
          </div>
        </section>

        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            What {childName} has been exploring
          </h2>
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
