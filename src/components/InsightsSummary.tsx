import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Clock, Palette, BookOpen, BarChart3, ChevronRight, Info, CalendarDays } from "lucide-react";
import {
  fetchStoriesCompleted,
  fetchBestStreak,
  fetchScreenTimeSeconds,
  fetchActiveDaysLast7,
  fetchBadgeProgress,
  fetchBucketBreakdown,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface InsightsSummaryProps {
  profileId: string | null;
  /** "card" wraps the panel in a card with a "See full insights" link (Home). "plain" renders bare sections (Insights page). */
  variant?: "card" | "plain";
  childName?: string;
}

const fmtMinutes = (seconds: number): string => {
  if (!seconds) return "0 min";
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min === 0 ? `${hr} hr` : `${hr}h ${min}m`;
};

type InfoBtnProps = {
  id: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  label: string;
  copy: string;
  align?: "left" | "right" | "center";
  className?: string;
};

const InfoBtn = ({ id, openId, setOpenId, label, copy, className }: InfoBtnProps) => {
  const open = openId === id;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const compute = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const margin = 8;
      const width = Math.min(240, window.innerWidth - margin * 2);
      let left = r.left + r.width / 2 - width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      setPos({ top: r.bottom + 6, left, width });
    };
    compute();
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(t)) setOpenId(null);
    };
    const onDismiss = () => setOpenId(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [open, setOpenId]);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpenId(open ? null : id);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-primary-deep"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && pos && (
        <span
          role="tooltip"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 rounded-xl border border-border bg-card p-2.5 text-left text-xs leading-snug text-foreground shadow-lg"
        >
          {copy}
        </span>
      )}
    </span>
  );
};

type BadgeChipProps = {
  badge: { id: string; emoji: string; label: string; description: string };
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const BadgeChip = ({ badge, openId, setOpenId }: BadgeChipProps) => {
  const tipId = `badge-${badge.id}`;
  const open = openId === tipId;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const compute = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const margin = 8;
      const width = Math.min(240, window.innerWidth - margin * 2);
      let left = r.left + r.width / 2 - width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      setPos({ top: r.bottom + 6, left, width });
    };
    compute();
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpenId(null);
    };
    const onDismiss = () => setOpenId(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [open, setOpenId]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`${badge.label} — badge info`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpenId(open ? null : tipId);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary/40"
      >
        <span className="text-sm">{badge.emoji}</span>
        {badge.label}
      </button>
      {open && pos && (
        <span
          role="tooltip"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 rounded-xl border border-border bg-card p-2.5 text-left text-xs leading-snug text-foreground shadow-lg"
        >
          <span className="mb-0.5 block font-bold">{badge.emoji} {badge.label}</span>
          {badge.description}
        </span>
      )}
    </>
  );
};

export const InsightsSummary = ({ profileId, variant = "card", childName }: InsightsSummaryProps) => {
  const nav = useNavigate();
  const enabled = !!profileId;
  const name = childName?.trim() || "your child";
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [showAllBadges, setShowAllBadges] = useState(false);

  const { data: screenTimeSec = 0 } = useQuery({
    queryKey: ["analytics-screen-time", profileId],
    queryFn: () => fetchScreenTimeSeconds(profileId!),
    enabled,
  });
  const { data: storiesListened = 0 } = useQuery({
    queryKey: ["analytics-stories-completed", profileId],
    queryFn: () => fetchStoriesCompleted(profileId!),
    enabled,
  });
  // Same counting as the Parents page: one entry per LuluTales skill (Courage, Kindness…).
  const { data: skillBars = [] } = useQuery({
    queryKey: ["analytics-bucket-breakdown", profileId],
    queryFn: () => fetchBucketBreakdown(profileId!),
    enabled,
  });
  const { data: bestStreak = 0 } = useQuery({
    queryKey: ["analytics-best-streak", profileId],
    queryFn: () => fetchBestStreak(profileId!),
    enabled,
  });
  const { data: activeDays = { active: 0, days: [false, false, false, false, false, false, false] } } = useQuery({
    queryKey: ["analytics-active-days-7", profileId],
    queryFn: () => fetchActiveDaysLast7(profileId!),
    enabled,
  });
  const { data: badgeProgress = [] } = useQuery({
    queryKey: ["analytics-badge-progress", profileId],
    queryFn: () => fetchBadgeProgress(profileId!),
    enabled,
  });
  const badges = useMemo(() => {
    const out: { id: string; emoji: string; label: string; description: string }[] = [];
    for (const bp of badgeProgress) {
      bp.tiers.forEach((t, i) => {
        if (!t.earned) return;
        out.push({
          id: `${bp.bucket}-${t.threshold}`,
          emoji: ["🥉", "🥈", "🥇"][i] ?? "🏅",
          label: t.label,
          description: `Awarded for finishing ${t.threshold} ${t.threshold === 1 ? "story" : "stories"} in ${bp.bucketName}.`,
        });
      });
    }
    return out;
  }, [badgeProgress]);

  const INITIAL_BADGES = 4;
  const showSeeAll = badges.length > INITIAL_BADGES && !showAllBadges;
  const visibleBadges = showAllBadges ? badges : badges.slice(0, INITIAL_BADGES);

  const tile = (id: string, Icon: typeof Clock, value: string, label: string, copy: string) => (
    <div className="relative flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
      <div className="absolute right-1 top-1">
        <InfoBtn id={id} openId={openInfo} setOpenId={setOpenInfo} label={label} align="center" copy={copy} />
      </div>
      <Icon className="h-4 w-4 text-primary-deep" />
      <div className="mt-1 text-lg font-extrabold leading-tight text-foreground">{value}</div>
      <div className="mt-0.5 text-xs leading-tight text-muted-foreground">{label}</div>
    </div>
  );

  // Same three numbers, in the same order and words, as the Parents page.
  const tiles = (
    <div className="grid grid-cols-3 gap-2">
      {tile(
        "t-stories",
        BookOpen,
        String(storiesListened),
        "Stories finished",
        `Stories ${name} has listened to all the way through. Started-but-not-finished ones don't count yet.`
      )}
      {tile(
        "t-screen",
        Clock,
        fmtMinutes(screenTimeSec),
        "Listening, not scrolling",
        `Roughly how long ${name} spent listening to stories instead of watching a screen.`
      )}
      {tile(
        "t-skills",
        Palette,
        String(skillBars.length),
        "Skills explored",
        `The different LuluTales skills ${name}'s finished stories have built, like kindness or courage. Each skill counts once, however many stories explore it.`
      )}
    </div>
  );

  const activeDaysCard = (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-2">
        <CalendarDays className="h-5 w-5 flex-shrink-0 text-primary-deep" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <div className="text-lg font-extrabold text-foreground">
              Active {activeDays.active} of last 7 days
            </div>
            <InfoBtn
              id="t-active"
              openId={openInfo}
              setOpenId={setOpenInfo}
              label="Active days"
              align="right"
              copy={`How many of the last 7 days ${name} listened to a story. A missed day never resets it — it just shows their real rhythm, with daily listening as the gentle goal.`}
            />
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            A gentle picture of {name}'s listening rhythm.
          </div>
          <div className="mt-3 flex items-center gap-2">
            {activeDays.days.map((on, i) => (
              <span
                key={i}
                aria-label={on ? "listened" : "no listen"}
                className={cn(
                  "h-3 w-3 rounded-full",
                  on ? "bg-primary" : "border border-border bg-secondary/50"
                )}
              />
            ))}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            filled = listened · oldest → today
          </div>
        </div>
      </div>
    </section>
  );

  const badgesBlock = (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1">
        <div className="text-sm font-semibold text-foreground">
          Badges earned
        </div>
        <InfoBtn
          id="t-badges"
          openId={openInfo}
          setOpenId={setOpenInfo}
          label="Badges earned"
          align="left"
          copy={`Little milestones ${name} unlocks along the way — a first story, a streak, or exploring a new life skill. Tap any badge to see what earned it.`}
        />
      </div>
      {badges.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Finish a story or build a streak to start earning badges ✨
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleBadges.map((b) => (
            <BadgeChip key={b.id} badge={b} openId={openInfo} setOpenId={setOpenInfo} />
          ))}
          {showSeeAll && (
            <button
              type="button"
              onClick={() => setShowAllBadges(true)}
              className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-bold text-primary-deep"
            >
              See all ({badges.length})
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (variant === "plain") {
    return (
      <>
        {tiles}
        {activeDaysCard}
        {badgesBlock}
      </>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      {tiles}
      <div className="mt-4">{activeDaysCard}</div>
      {badgesBlock}
      <button
        onClick={() => nav("/insights")}
        className="mt-4 flex w-full items-center gap-2 border-t border-border pt-3 text-left"
      >
        <BarChart3 className="h-4 w-4 text-primary-deep" />
        <div className="flex-1 text-xs font-bold text-foreground">See full insights</div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </section>
  );
};
