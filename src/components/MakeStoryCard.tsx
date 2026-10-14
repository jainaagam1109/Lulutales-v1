import { Link } from "react-router-dom";
import { Plus, Clock } from "lucide-react";
import { useFamily, formatDay, nextMonthStart } from "@/lib/family";
import { LuluLogo } from "@/components/LuluLogo";

/** Lulu, shown whole (with clear space) on the right of the big card. */
const LuluMark = () => (
  <span className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 min-[340px]:block" aria-hidden="true">
    <LuluLogo size={72} showWordmark={false} />
  </span>
);

const Pill = ({ children, onTint = false }: { children: React.ReactNode; onTint?: boolean }) => (
  <span
    className={`relative inline-flex min-h-7 items-center self-start rounded-full px-3 text-[13px] font-semibold ${
      onTint ? "bg-background/80 text-foreground" : "bg-accent text-foreground"
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
    return (
      <div className="flex flex-col gap-2 rounded-[22px] border border-border bg-card p-5">
        <Pill>
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          Opening soon
        </Pill>
        <h2 className="brand-title !text-[19px] text-foreground">
          {size === "strip" ? "Personalised stories open soon" : `${childName ? `${childName}’s` : "Your child’s"} own stories open soon.`}
        </h2>
        <p className="text-sm text-muted-foreground">
          We’re opening personalised stories to new parents in small batches. The whole library is open while you wait.
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
        <h2 className="brand-title !text-[19px] text-foreground">Personalised stories aren’t open on this account</h2>
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
        <h2 className="brand-title !text-[19px] text-foreground">All {fam.total} personalised stories used this month</h2>
        <p className="text-sm text-muted-foreground">
          New stories on {nextMonthStart()}. Until then, {name} can replay favourites or explore the library.
        </p>
        <Link to="/library" className="mt-1 text-sm font-semibold text-primary">
          Open the library →
        </Link>
      </div>
    );
  }

  const left = fam.noLimit ? null : `${Math.max(0, fam.remaining)} of ${fam.total} personalised stories left this month`;

  // ---------- Slim strip (My stories) ----------
  if (size === "strip") {
    return (
      <Link
        to={to}
        className="lt-card flex items-center gap-3 rounded-[20px] border border-border bg-accent p-3.5 pl-4 text-accent-foreground dark:bg-card"
      >
        <div className="min-w-0 flex-1">
          <div className="brand-title text-accent-foreground">New story for {name}</div>
          {left && <div className="text-xs text-muted-foreground">{left}</div>}
        </div>
        <span className="inline-flex min-h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Make
        </span>
      </Link>
    );
  }

  // ---------- Big Lamplight card (Home) ----------
  // Brand rule: violet only on the button and Lulu; the card itself is a flat tint with Night Ink text.
  return (
    <Link
      to={to}
      className="lt-card relative flex flex-col gap-2.5 overflow-hidden rounded-[26px] border border-border bg-accent p-[22px] text-accent-foreground dark:bg-card"
    >
      <LuluMark />
      {left && <Pill onTint>{left}</Pill>}
      <h2 className="relative min-[340px]:max-w-[calc(100%-92px)] font-[Quicksand] text-[23px] font-bold leading-tight text-accent-foreground">
        {firstStory ? `Let’s make ${name}’s first story` : `Make a new story for ${name}`}
      </h2>
      <p className="relative min-[340px]:max-w-[calc(100%-92px)] text-sm text-muted-foreground">
        {firstStory
          ? "Pick a moment they’re facing. It takes about 5 minutes."
          : "Pick a feeling or a moment. We write it just for them."}
      </p>
      <span className="relative mt-1 inline-flex min-h-[46px] items-center self-start rounded-full bg-primary px-[22px] font-semibold text-primary-foreground">
        {firstStory ? "Make the first story" : "Make a story"}
      </span>
    </Link>
  );
};

export default MakeStoryCard;
