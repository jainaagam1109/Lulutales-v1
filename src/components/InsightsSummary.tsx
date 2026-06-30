import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Clock, Palette, BookOpen, BarChart3, ChevronRight, Info, CalendarDays } from "lucide-react";
import {
  fetchStoriesCompleted,
  fetchCompletedThemes,
  fetchBestStreak,
  fetchScreenTimeSeconds,
  fetchActiveDaysLast7,
  computeBadgesFromDb,
} from "@/lib/analytics";
import { useThemeBuckets } from "@/hooks/useThemeBuckets";
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

const InfoBtn = ({ id, openId, setOpenId, label, copy, align = "center", className }: InfoBtnProps) => {
  const open = openId === id;
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, setOpenId]);

  return (
    <span ref={wrapRef} className={cn("relative inline-flex", className)}>
      <button
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
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute top-full z-40 mt-1 w-56 rounded-xl border border-border bg-card p-2.5 text-left text-[11px] leading-snug text-foreground shadow-lg",
            align === "left" && "left-0",
            align === "right" && "right-0",
            align === "center" && "left-1/2 -translate-x-1/2"
          )}
        >
          {copy}
        </span>
      )}
    </span>
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
  const { data: completedThemes = [] } = useQuery({
    queryKey: ["analytics-completed-themes", profileId],
    queryFn: () => fetchCompletedThemes(profileId!),
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
  const themeBuckets = useThemeBuckets();
  const badges = useMemo(
    () => computeBadgesFromDb(storiesListened, completedThemes, bestStreak, themeBuckets),
    [storiesListened, completedThemes, bestStreak, themeBuckets]
  );

  const INITIAL_BADGES = 4;
  const showSeeAll = badges.length > INITIAL_BADGES && !showAllBadges;
  const visibleBadges = showAllBadges ? badges : badges.slice(0, INITIAL_BADGES);

  const tiles = (
    <div className="grid grid-cols-3 gap-2">
      <div className="relative flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
        <div className="absolute right-1 top-1">
          <InfoBtn
            id="t-screen"
            openId={openInfo}
            setOpenId={setOpenInfo}
            label="Screen time saved"
            align="right"
            copy={`Roughly how long ${name} spent listening instead of watching a screen. It's an estimate based on story length — a gentle sense of time well spent.`}
          />
        </div>
        <Clock className="h-4 w-4 text-primary-deep" />
        <div className="mt-1 text-lg font-extrabold leading-tight text-foreground">{fmtMinutes(screenTimeSec)}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Screen time saved</div>
      </div>
      <div className="relative flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
        <div className="absolute right-1 top-1">
          <InfoBtn
            id="t-skills"
            openId={openInfo}
            setOpenId={setOpenInfo}
            label="Life-skills learnt"
            align="center"
            copy={`The different kinds of life skills ${name}'s stories have touched on — like kindness, courage or independence. We count each skill once, however many stories explore it.`}
          />
        </div>
        <Palette className="h-4 w-4 text-primary-deep" />
        <div className="mt-1 text-lg font-extrabold text-foreground">{completedThemes.length}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Life-skills learnt</div>
      </div>
      <div className="relative flex flex-col items-center rounded-xl bg-secondary/50 p-3 text-center">
        <div className="absolute right-1 top-1">
          <InfoBtn
            id="t-stories"
            openId={openInfo}
            setOpenId={setOpenInfo}
            label="Stories finished"
            align="right"
            copy={`Stories ${name} has listened to all the way through. Started-but-not-finished ones don't count yet — this is the finish line, not the start.`}
          />
        </div>
        <BookOpen className="h-4 w-4 text-primary-deep" />
        <div className="mt-1 text-lg font-extrabold text-foreground">{storiesListened}</div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Stories finished</div>
      </div>
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
              copy={`How many of the last 7 days ${name} listened to a story. A missed day never resets it — it just shows your real rhythm, with daily listening as the gentle goal.`}
            />
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
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
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            filled = listened · oldest → today
          </div>
        </div>
      </div>
    </section>
  );

  const badgesBlock = (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
        <p className="text-xs text-muted-foreground">
          Finish a story or build a streak to start earning badges ✨
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleBadges.map((b) => (
            <div
              key={b.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-foreground"
            >
              <span className="text-sm">{b.emoji}</span>
              {b.label}
            </div>
          ))}
          {showSeeAll && (
            <button
              type="button"
              onClick={() => setShowAllBadges(true)}
              className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-bold text-primary-deep"
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
