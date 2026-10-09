import { Link } from "react-router-dom";
import { Plus, Clock } from "lucide-react";
import { useFamily, formatDay, nextMonthStart } from "@/lib/family";

/** A little Lulu face that peeks out of the corner of the big violet card. */
const LuluPeek = () => (
  <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" className="pointer-events-none absolute -bottom-7 -right-5 opacity-95">
    <circle cx="60" cy="60" r="56" fill="hsl(var(--lamplight))" />
    <path d="M38 52q7-8 14 0M68 52q7-8 14 0" fill="none" stroke="hsl(var(--lamplight-foreground))" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M46 66v4a14 14 0 0 0 28 0v-4" fill="none" stroke="hsl(var(--lamplight-foreground))" strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);

const Pill = ({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) => (
  <span
    className={`relative inline-flex min-h-7 items-center self-start rounded-full px-3 text-[13px] font-semibold ${
      dark ? "bg-white/20 text-white" : "bg-accent text-foreground"
    }`}
  >
    {children}
  </span>
);

/**
 * The "make a story" card, in every state a family can be in:
 * waiting for approval, blocked, used up this month, or ready to make one.
 * `size="strip"` is the slim version used at the top of My stories.
 */
export const MakeStoryCard = ({
  childName,
  hasChild,
  firstStory = false,
  size = "hero",
}: {
  childName: string | null;
  hasChild: boolean;
  firstStory?: boolean;
  size?: "hero" | "strip";
}) => {
  const fam = useFamily();
  const name = childName || "your child";
  const to = hasChild ? "/magic-hub" : "/onboarding?next=%2Fmagic-hub";
  if (fam.loading) return null;

  // ---------- Waiting for approval ----------
  if (fam.status === "waiting") {
    const day = formatDay(fam.autoApproveAt);
    return (
      <div className="flex flex-col gap-2 rounded-[22px] border border-border bg-card p-5">
        <Pill>
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          {day ? `Opens by ${day}` : "Opens soon"}
        </Pill>
        <h2 className="brand-title !text-[19px] text-foreground">
          {size === "strip" ? "Making stories opens soon" : `${childName ? `${childName}’s` : "Your child’s"} own stories open soon.`}
        </h2>
        <p className="text-sm text-muted-foreground">
          We review requests within 48 hours and email you. The whole library is open while you wait.
        </p>
        <Link to="/library" className="mt-1 text-sm font-semibold text-primary">
          Open the library →
        </Link>
      </div>
    );
  }

  // ---------- Blocked ----------
  if (fam.status === "blocked") {
    return (
      <div className="flex flex-col gap-2 rounded-[22px] border border-border bg-card p-5">
        <h2 className="brand-title !text-[19px] text-foreground">Making stories isn’t open on this account</h2>
        <p className="text-sm text-muted-foreground">
          If you think this is a mistake, write to us at{" "}
          <a href="mailto:hello@lulutales.in" className="font-semibold text-primary">hello@lulutales.in</a>.
        </p>
      </div>
    );
  }

  // ---------- Used up this month ----------
  if (!fam.noLimit && fam.remaining <= 0) {
    return (
      <div className="flex flex-col gap-2 rounded-[22px] border border-border bg-card p-5">
        <h2 className="brand-title !text-[19px] text-foreground">You’ve made all {fam.total} stories this month</h2>
        <p className="text-sm text-muted-foreground">
          New stories on {nextMonthStart()}. Until then, {name} can replay favourites or explore the library.
        </p>
        <Link to="/library" className="mt-1 text-sm font-semibold text-primary">
          Open the library →
        </Link>
      </div>
    );
  }

  const left = fam.noLimit ? null : `Your family: ${fam.remaining} of ${fam.total} left this month`;

  // ---------- Slim strip (My stories) ----------
  if (size === "strip") {
    return (
      <Link
        to={to}
        className="lt-card flex items-center gap-3 rounded-[20px] bg-primary p-3.5 pl-4 text-primary-foreground"
      >
        <div className="min-w-0 flex-1">
          <div className="brand-title text-white">New story for {name}</div>
          {left && <div className="text-xs text-white/80">{left.replace(" this month", "")}</div>}
        </div>
        <span className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[hsl(var(--lamplight))] px-4 text-sm font-semibold text-[hsl(var(--lamplight-foreground))]">
          <Plus className="h-4 w-4" /> Make
        </span>
      </Link>
    );
  }

  // ---------- Big violet card (Home) ----------
  return (
    <Link
      to={to}
      className="lt-card relative flex flex-col gap-2.5 overflow-hidden rounded-[26px] bg-primary p-[22px] text-primary-foreground"
    >
      <LuluPeek />
      {left && <Pill dark>{left}</Pill>}
      <h2 className="relative max-w-[240px] font-[Quicksand] text-[23px] font-bold leading-tight text-white">
        {firstStory ? `Let’s make ${name}’s first story` : `Make a new story for ${name}`}
      </h2>
      <p className="relative max-w-[230px] text-sm !text-white/85">
        {firstStory
          ? "Pick a moment they’re facing. It takes about 5 minutes."
          : "Pick a feeling or a moment. We write it just for them."}
      </p>
      <span className="relative mt-1 inline-flex min-h-[46px] items-center self-start rounded-full bg-[hsl(var(--lamplight))] px-[22px] font-semibold text-[hsl(var(--lamplight-foreground))]">
        {firstStory ? "Make the first story" : "Make a story"}
      </span>
    </Link>
  );
};

export default MakeStoryCard;
