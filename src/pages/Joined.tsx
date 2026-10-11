import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { LuluLogo } from "@/components/LuluLogo";
import { useAuth } from "@/hooks/useAuth";
import { useFamily, formatDay } from "@/lib/family";
import { supabase } from "@/integrations/supabase/client";

/** Shown once, right after a new family adds their child: "You're on the list" or "You're in". */
const Joined = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const fam = useFamily();
  const name = (typeof window !== "undefined" && localStorage.getItem("lulutales_child_name")) || "your child";

  const { data: access, isLoading } = useQuery({
    queryKey: ["joined-access", user?.id, fam.status],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("family_access").select("approved_by").eq("user_id", user!.id).maybeSingle();
      return data as { approved_by: string | null } | null;
    },
  });
  const invited = access?.approved_by === "invite";

  // Approved without an invite (e.g. an existing family): nothing special to say.
  useEffect(() => {
    if (!fam.loading && !isLoading && fam.status === "approved" && !invited) nav("/", { replace: true });
  }, [fam.loading, fam.status, isLoading, invited, nav]);

  if (fam.loading || isLoading || (fam.status === "approved" && !invited)) {
    return (
      <PhoneShell>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>
      </PhoneShell>
    );
  }

  const Point = ({ title, sub }: { title: string; sub: string }) => (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-3.5 w-3.5" />
      </span>
      <span>
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="block text-sm text-muted-foreground">{sub}</span>
      </span>
    </li>
  );

  if (invited) {
    return (
      <PhoneShell>
        <main className="flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-6 md:justify-center">
          <div className="mb-8"><LuluLogo size={34} /></div>
          <span className="mb-3 inline-flex min-h-7 items-center self-start rounded-full bg-primary/10 px-3 text-[13px] font-semibold text-primary">Invited by a friend</span>
          <h1 className="font-[Quicksand] text-[28px] font-bold leading-tight text-foreground">You’re in. Let’s make {name}’s first story.</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">A friend invited you, so you skip the wait. They get 2 extra stories this month as a thank you.</p>
          <ul className="mt-6 flex flex-col gap-4">
            <Point title="5 personalised stories a month" sub="Free until 31 December 2026." />
            <Point title="The full story library" sub="Including every new story we add." />
          </ul>
          <div className="mt-auto flex flex-col gap-2 pt-8">
            <Link to="/magic-hub" className="lt-card flex min-h-12 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
              Make {name}’s first story
            </Link>
            <Link to="/library" className="flex min-h-12 items-center justify-center font-semibold text-primary">Listen to the library first</Link>
          </div>
        </main>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <main className="flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-6 md:justify-center">
        <div className="mb-8"><LuluLogo size={34} /></div>
        <h1 className="font-[Quicksand] text-[28px] font-bold leading-tight text-foreground">You’re on the list.</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          We’re opening personalised stories to a few families at a time, so each one gets our full care.
        </p>
        <ul className="mt-6 flex flex-col gap-4">
          <Point title="The story library is open" sub="Listen to any story today." />
          <Point title={`${name}’s own stories, soon`} sub="We’re letting families in a few at a time." />
        </ul>
        <div className="mt-auto flex flex-col gap-2 pt-8">
          <Link to="/library" className="lt-card flex min-h-12 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
            Explore the story library
          </Link>
          <p className="text-center text-sm text-muted-foreground">Free until 31 December 2026. Up to 5 personalised stories a month.</p>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Have an invite link from a friend? Open it now and you skip the wait.
          </p>
        </div>
      </main>
    </PhoneShell>
  );
};

export default Joined;
