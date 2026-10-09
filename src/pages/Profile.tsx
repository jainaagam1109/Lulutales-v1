import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, Mail, Flag, Info, Shield, LogOut, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { ProfileSwitcherChip } from "@/components/ProfileAvatarButton";
import { ParentCheck, parentCheckPassed } from "@/components/ParentCheck";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useFamily, formatDay, nextMonthStart } from "@/lib/family";
import { useParentSettings, type Look } from "@/lib/parentSettings";
import { fetchStoriesCompleted, fetchScreenTimeSeconds, fetchActiveDaysLast7, fetchBucketBreakdown } from "@/lib/analytics";

const fmtTime = (secs: number) => {
  const m = Math.round(secs / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

const Section = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className="flex flex-col gap-2.5">
    <div className="flex items-baseline justify-between">
      <h2 className="font-[Quicksand] text-[19px] font-bold text-foreground">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-[20px] border border-border bg-card ${className}`}>{children}</div>
);

const Chips = <T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) => (
  <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
    {options.map((o) => (
      <button
        key={String(o.value)}
        type="button"
        role="radio"
        aria-checked={value === o.value}
        onClick={() => onChange(o.value)}
        className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${
          value === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const LinkRow = ({
  icon: Icon,
  title,
  sub,
  onClick,
  to,
  href,
  danger,
}: {
  icon: any;
  title: string;
  sub?: string;
  onClick?: () => void;
  to?: string;
  href?: string;
  danger?: boolean;
}) => {
  const inner = (
    <>
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${danger ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${danger ? "text-destructive" : "text-foreground"}`}>{title}</span>
        {sub && <span className="block truncate text-sm text-muted-foreground">{sub}</span>}
      </span>
      {!danger && <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
    </>
  );
  const cls = "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left";
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
};

type Kid = { id: string; name: string; age: number | null; gender: string | null; city: string | null; status: string };

const Profile = () => {
  const nav = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const fam = useFamily();
  const { settings, update } = useParentSettings();
  const [checked, setChecked] = useState(parentCheckPassed());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: kids = [] } = useQuery({
    queryKey: ["parents-kids", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Kid[]> => {
      const { data } = await (supabase as any)
        .from("child_profiles")
        .select("id, name, age, gender, city, status")
        .eq("user_id", user!.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: true });
      return (data ?? []) as Kid[];
    },
  });
  const active = kids.find((k) => k.status === "active") ?? kids[0] ?? null;

  const { data: plan } = useQuery({
    queryKey: ["parents-plan", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: s }, { data: a }] = await Promise.all([
        (supabase as any).from("app_settings").select("free_until").limit(1).maybeSingle(),
        (supabase as any).from("family_access").select("founding_number").eq("user_id", user!.id).maybeSingle(),
      ]);
      return { freeUntil: (s?.free_until as string | null) ?? null, founding: (a?.founding_number as number | null) ?? null };
    },
  });

  const { data: insight } = useQuery({
    queryKey: ["parents-insight", active?.id],
    enabled: !!active?.id,
    queryFn: async () => {
      const id = active!.id;
      const [finished, secs, days, skills] = await Promise.all([
        fetchStoriesCompleted(id),
        fetchScreenTimeSeconds(id),
        fetchActiveDaysLast7(id),
        fetchBucketBreakdown(id),
      ]);
      return { finished, secs, activeDays: days.active, skills };
    },
  });

  const save = async (patch: Parameters<typeof update>[0]) => {
    try {
      await update(patch);
    } catch {
      toast.error("We couldn’t save that. Please try again.");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };

  if (!checked) {
    return (
      <PhoneShell withNav>
        <div className="flex-1" />
        <ParentCheck reason="This area is for parents." onPass={() => setChecked(true)} onCancel={() => nav("/")} />
        <BottomNav />
      </PhoneShell>
    );
  }

  const childName = active?.name ?? "your child";
  const freeUntil = formatDay(plan?.freeUntil) ?? "31 December";
  const freeYear = plan?.freeUntil ? new Date(plan.freeUntil).getFullYear() : 2026;

  return (
    <PhoneShell withNav>
      <header className="flex items-center justify-between px-5 pb-1 pt-3 md:px-10 md:pt-10">
        <div>
          <h1 className="font-[Quicksand] text-[26px] font-bold text-foreground md:text-[32px]">Parents</h1>
          <span className="text-sm text-muted-foreground">Grown-ups only</span>
        </div>
        <div className="md:hidden">
          <ProfileSwitcherChip />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 md:px-10 md:pb-12">
        <div className="flex max-w-[640px] flex-col gap-7">
          {/* ---------- Learning ---------- */}
          {active && (
            <Section title={`What ${childName} is learning`}>
              <Card className="p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { n: insight ? String(insight.finished) : "–", l: "Stories finished" },
                    { n: insight ? fmtTime(insight.secs) : "–", l: "Listening, not scrolling" },
                    { n: insight ? String(insight.skills.length) : "–", l: "Skills explored" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-2xl bg-muted px-2 py-3">
                      <div className="font-[Quicksand] text-[22px] font-bold text-foreground">{s.n}</div>
                      <div className="text-xs leading-tight text-muted-foreground">{s.l}</div>
                    </div>
                  ))}
                </div>
                {insight && insight.skills.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {insight.skills.slice(0, 4).map((b) => (
                      <li key={b.bucket}>
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-foreground">{b.label}</span>
                          <span className="text-muted-foreground">
                            {b.storyCount} {b.storyCount === 1 ? "story" : "stories"}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${b.pct}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {insight && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {insight.finished === 0
                      ? `Once ${childName} finishes a story, you’ll see the skills they’re building here.`
                      : `Listened on ${insight.activeDays} of the last 7 days.`}
                  </p>
                )}
                <Link to="/insights" className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-primary">
                  See every story and skill →
                </Link>
              </Card>
            </Section>
          )}

          {/* ---------- Children ---------- */}
          <Section title="Children">
            <Card className="divide-y divide-border">
              {kids.map((k) => (
                <Link key={k.id} to="/profiles" className="flex min-h-16 items-center gap-3 px-4 py-2.5">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent font-[Quicksand] font-bold text-foreground">
                    {k.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-foreground">{k.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[k.age, k.gender && !/prefer|rather/i.test(k.gender) ? k.gender : null, k.city].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-primary">Edit</span>
                </Link>
              ))}
              <Link to="/add-child" className="flex min-h-16 items-center gap-3 px-4 py-2.5">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border text-foreground">
                  <Plus className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-semibold text-foreground">Add a child</span>
                  <span className="block text-sm text-muted-foreground">Each child gets their own stories</span>
                </span>
              </Link>
            </Card>
          </Section>

          {/* ---------- Plan ---------- */}
          <Section title="Your plan">
            <Card className="p-4">
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">
                  Founding family{plan?.founding ? ` #${plan.founding}` : ""}
                </span>
                <span className="text-sm text-muted-foreground">
                  Free until {freeUntil} {freeYear}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {fam.status === "waiting"
                  ? `We review requests within 48 hours.${fam.autoApproveAt ? ` Making stories opens by ${formatDay(fam.autoApproveAt)}.` : ""}`
                  : fam.noLimit
                    ? "Your family has no monthly limit."
                    : `Your family has ${Math.max(0, fam.remaining)} of ${fam.total} stories left. New stories on ${nextMonthStart()}.`}
              </p>
            </Card>
          </Section>

          {/* ---------- Listening ---------- */}
          <Section title="Listening">
            <Card className="divide-y divide-border">
              <div className="p-4">
                <div className="mb-2.5 font-semibold text-foreground">Sleep timer</div>
                <Chips
                  label="Sleep timer"
                  value={settings.sleep_timer_minutes}
                  onChange={(v) => save({ sleep_timer_minutes: v })}
                  options={[
                    { value: 0, label: "Off" },
                    { value: 15, label: "15 min" },
                    { value: 30, label: "30 min" },
                    { value: 45, label: "45 min" },
                  ]}
                />
                <p className="mt-2 text-sm text-muted-foreground">Audio fades out and stops when the time is up.</p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">Play the next story automatically</span>
                  <span className="block text-sm text-muted-foreground">Episodes of the same story always play on.</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.autoplay_next_story}
                  onClick={() => save({ autoplay_next_story: !settings.autoplay_next_story })}
                  className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${settings.autoplay_next_story ? "bg-primary" : "bg-border"}`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${settings.autoplay_next_story ? "left-[22px]" : "left-0.5"}`}
                  />
                </button>
              </label>
              <div className="p-4">
                <div className="mb-2.5 font-semibold text-foreground">Look</div>
                <Chips<Look>
                  label="Look"
                  value={settings.look}
                  onChange={(v) => save({ look: v })}
                  options={[
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                    { value: "auto", label: "Dark at night" },
                  ]}
                />
                <p className="mt-2 text-sm text-muted-foreground">Dark at night switches on from 7 pm to 7 am.</p>
              </div>
            </Card>
          </Section>

          {/* ---------- Help ---------- */}
          <Section title="Help and info">
            <Card className="divide-y divide-border">
              <LinkRow
                icon={Flag}
                title="Report a problem"
                sub="Tell us what went wrong"
                href="mailto:hello@lulutales.in?subject=Problem%20with%20LuluTales"
              />
              <LinkRow icon={Mail} title="Contact us" sub="hello@lulutales.in" href="mailto:hello@lulutales.in" />
              <LinkRow icon={Info} title="About LuluTales" sub="Who we are and how stories are made" to="/welcome" />
            </Card>
          </Section>

          {/* ---------- Account ---------- */}
          <Section title="Account">
            <Card className="divide-y divide-border">
              {isAdmin && <LinkRow icon={Shield} title="Admin" sub="Only you can see this" to="/admin" />}
              <LinkRow icon={LogOut} title="Sign out" sub={user?.email ?? undefined} onClick={handleSignOut} />
              <LinkRow icon={Trash2} title="Delete account" sub="Removes your family and stories for good" onClick={() => setConfirmDelete(true)} danger />
            </Card>
          </Section>
        </div>
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" role="dialog" aria-modal="true" onClick={() => setConfirmDelete(false)}>
          <div
            className="w-full max-w-[440px] rounded-t-[28px] bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-foreground md:rounded-[28px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-[Quicksand] text-[22px] font-bold">Delete your account?</h2>
              <button type="button" onClick={() => setConfirmDelete(false)} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-[15px] text-muted-foreground">
              This removes your family, your children’s details and every story made for them. It can’t be undone.
            </p>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Send us the request from this email address and we’ll confirm once it’s done.
            </p>
            <a
              href={`mailto:hello@lulutales.in?subject=${encodeURIComponent("Please delete my LuluTales account")}&body=${encodeURIComponent(
                `Please delete my LuluTales account and all my family's data.\n\nAccount email: ${user?.email ?? ""}`
              )}`}
              className="lt-card mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-destructive font-semibold text-destructive-foreground"
            >
              Email my delete request
            </a>
            <button type="button" onClick={() => setConfirmDelete(false)} className="mt-2 min-h-12 w-full font-semibold text-primary">
              Keep my account
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </PhoneShell>
  );
};

export default Profile;
