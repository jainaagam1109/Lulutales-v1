import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Stat, Pill, SetupNeeded } from "./AdminShell";

const db = supabase as any;

type Family = {
  user_id: string;
  email: string;
  provider: string;
  signed_up_at: string;
  status: "waiting" | "approved" | "blocked";
  auto_approve_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  invited_by_email: string | null;
  founding_number: number | null;
  no_limit: boolean;
  block_reason: string | null;
  children: { name: string; age: number | null }[];
  stories_this_month: number;
  last_listened: string | null;
};

type Settings = {
  founding_places: number;
  free_until: string;
  monthly_story_limit: number;
  invite_bonus_stories: number;
  auto_approve_enabled: boolean;
  auto_approve_hours: number;
  block_list: string[];
};

const useSettings = () =>
  useQuery({
    queryKey: ["admin-settings"],
    queryFn: async (): Promise<Settings | null> => {
      const { data } = await db.from("app_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

const useFamilies = () =>
  useQuery({
    queryKey: ["admin-families"],
    queryFn: async (): Promise<{ rows: Family[]; missing: boolean }> => {
      const { data, error } = await db.rpc("admin_families");
      if (error) return { rows: [], missing: true };
      return { rows: (data ?? []) as Family[], missing: false };
    },
  });

// ---------- formatting ----------
const when = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 864e5);
  const t = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (days === 0 && new Date().getDate() === d.getDate()) return `Today, ${t}`;
  if (days <= 1) return `Yesterday, ${t}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const ago = (iso: string | null) => {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
};
const hoursLeft = (iso: string | null) => {
  if (!iso) return "—";
  const h = Math.ceil((new Date(iso).getTime() - Date.now()) / 36e5);
  return h <= 0 ? "Due now" : `in ${h} h`;
};
const kidsLine = (k: Family["children"]) =>
  k.length === 0 ? "No child added yet" : k.length === 1 ? `${k[0].name}, ${k[0].age ?? "?"}` : k.map((c) => `${c.name}, ${c.age ?? "?"}`).join(" · ");
const providerLabel = (p: string) => (p === "google" ? "Google" : "Email");
const blockMatch = (email: string, list: string[] = []) => list.find((w) => w && email.toLowerCase().includes(w.toLowerCase())) ?? null;

const btn = "min-h-9 rounded-full px-4 text-sm font-semibold";

// ======================================================================
// Requests
// ======================================================================
export const AdminRequests = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useFamilies();
  const { data: settings } = useSettings();
  const [tab, setTab] = useState<"waiting" | "approved" | "blocked">("waiting");
  const [busy, setBusy] = useState<string | null>(null);
  const rows = data?.rows ?? [];

  const act = async (f: Family, action: "approve" | "block" | "unblock") => {
    let reason: string | null = null;
    if (action === "block") {
      reason = window.prompt(`Block ${f.email}? Add a short reason (only admins see it).`, "") ?? null;
      if (reason === null) return;
    }
    setBusy(f.user_id);
    const { error } = await db.rpc("admin_set_access", { _user_id: f.user_id, _action: action, _reason: reason });
    setBusy(null);
    if (error) return toast.error("That didn’t work. Please try again.");
    toast.success(action === "approve" ? `${f.email} approved` : action === "block" ? `${f.email} blocked` : `${f.email} moved back to waiting`);
    qc.invalidateQueries({ queryKey: ["admin-families"] });
  };

  const waiting = rows.filter((r) => r.status === "waiting");
  const safeWaiting = waiting.filter((r) => !blockMatch(r.email, settings?.block_list));
  const approveAll = async () => {
    if (!window.confirm(`Approve ${safeWaiting.length} waiting families? Anyone matching the block list is left for you to check.`)) return;
    setBusy("all");
    for (const f of safeWaiting) await db.rpc("admin_set_access", { _user_id: f.user_id, _action: "approve", _reason: null });
    setBusy(null);
    toast.success(`${safeWaiting.length} families approved`);
    qc.invalidateQueries({ queryKey: ["admin-families"] });
  };

  const usedPlaces = rows.filter((r) => r.founding_number).length;
  const weekAgo = Date.now() - 7 * 864e5;
  const approvedWeek = rows.filter((r) => r.approved_at && new Date(r.approved_at).getTime() > weekAgo).length;
  const list = rows
    .filter((r) => r.status === tab)
    .sort((a, b) => (tab === "waiting" ? (a.auto_approve_at ?? "").localeCompare(b.auto_approve_at ?? "") : (b.approved_at ?? b.signed_up_at).localeCompare(a.approved_at ?? a.signed_up_at)));

  return (
    <AdminShell
      title="Requests"
      intro={`New families waiting for personalised stories. Anyone you don’t act on is approved automatically after ${settings?.auto_approve_hours ?? 48} hours.`}
      actions={
        tab === "waiting" && safeWaiting.length > 0 ? (
          <button type="button" disabled={busy === "all"} onClick={approveAll} className={`${btn} lt-card bg-primary text-primary-foreground disabled:opacity-50`}>
            Approve all {safeWaiting.length}
          </button>
        ) : null
      }
    >
      {data?.missing ? (
        <SetupNeeded />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat n={waiting.length} label="Waiting" />
            <Stat n={`${usedPlaces} of ${settings?.founding_places ?? 200}`} label="Founding places used" />
            <Stat n={approvedWeek} label="Approved this week" />
          </div>
          <div className="mb-4 flex gap-2">
            <Pill on={tab === "waiting"} onClick={() => setTab("waiting")}>Waiting · {waiting.length}</Pill>
            <Pill on={tab === "approved"} onClick={() => setTab("approved")}>Approved</Pill>
            <Pill on={tab === "blocked"} onClick={() => setTab("blocked")}>Blocked</Pill>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-border bg-card p-6 text-[15px] text-muted-foreground">
              {tab === "waiting" ? "No one is waiting right now." : "Nobody here yet."}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-[18px] border border-border bg-card">
              {list.slice(0, 200).map((f) => {
                const match = blockMatch(f.email, settings?.block_list);
                return (
                  <li key={f.user_id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{f.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {providerLabel(f.provider)} · {kidsLine(f.children)}
                        {f.invited_by_email ? ` · Invited by ${f.invited_by_email}` : ""}
                      </div>
                      {match && f.status === "waiting" && <div className="mt-1 text-sm font-semibold text-destructive">Matches block list: “{match}”</div>}
                      {f.status === "blocked" && f.block_reason && <div className="mt-1 text-sm text-muted-foreground">Reason: {f.block_reason}</div>}
                    </div>
                    <div className="text-sm text-muted-foreground md:w-40">Signed up {when(f.signed_up_at)}</div>
                    <div className="text-sm md:w-36">
                      {f.status === "waiting"
                        ? `Auto-approves ${hoursLeft(f.auto_approve_at)}`
                        : f.status === "approved"
                          ? `Approved${f.approved_by ? ` by ${f.approved_by}` : ""}${f.founding_number ? ` · #${f.founding_number}` : ""}`
                          : "Blocked"}
                    </div>
                    <div className="flex gap-2">
                      {f.status !== "approved" && (
                        <button type="button" disabled={busy === f.user_id} onClick={() => act(f, "approve")} className={`${btn} lt-card bg-primary text-primary-foreground disabled:opacity-50`}>
                          Approve
                        </button>
                      )}
                      {f.status !== "blocked" ? (
                        <button type="button" disabled={busy === f.user_id} onClick={() => act(f, "block")} className={`${btn} border border-border`}>
                          Block
                        </button>
                      ) : (
                        <button type="button" disabled={busy === f.user_id} onClick={() => act(f, "unblock")} className={`${btn} border border-border`}>
                          Unblock
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </AdminShell>
  );
};

// ======================================================================
// Families
// ======================================================================
export const AdminFamilies = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useFamilies();
  const { data: settings } = useSettings();
  const [q, setQ] = useState("");
  const rows = (data?.rows ?? []).filter((r) => r.status === "approved");
  const limit = settings?.monthly_story_limit ?? 5;
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(s) || r.children.some((c) => c.name?.toLowerCase().includes(s)));
  }, [rows, q]);

  const toggleNoLimit = async (f: Family) => {
    let { data: changed, error } = await db.from("family_access").update({ no_limit: !f.no_limit }).eq("user_id", f.user_id).select("user_id");
    if (!error && (!changed || changed.length === 0)) {
      // Older family with no access record yet: create it as approved, then set the switch.
      await db.rpc("admin_set_access", { _user_id: f.user_id, _action: "approve", _reason: null });
      ({ error } = await db.from("family_access").update({ no_limit: !f.no_limit }).eq("user_id", f.user_id));
    }
    if (error) return toast.error("That didn’t save. Please try again.");
    toast.success(!f.no_limit ? `No limit on for ${f.email}` : `Monthly limit back on for ${f.email}`);
    qc.invalidateQueries({ queryKey: ["admin-families"] });
  };

  const weekAgo = Date.now() - 7 * 864e5;
  return (
    <AdminShell title="Families" intro="Everyone who can make personalised stories. Switch on No limit for test accounts or special cases.">
      {data?.missing ? (
        <SetupNeeded />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat n={rows.length} label="Families approved" />
            <Stat n={rows.reduce((a, r) => a + r.children.length, 0)} label="Children" />
            <Stat n={rows.filter((r) => r.last_listened && new Date(r.last_listened).getTime() > weekAgo).length} label="Listened this week" />
            <Stat n={rows.filter((r) => !r.no_limit && r.stories_this_month >= limit).length} label="Hit the monthly limit" />
          </div>
          <label className="mb-4 flex min-h-11 max-w-[420px] items-center gap-2 rounded-full border border-border bg-card px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or child’s name" className="flex-1 bg-transparent text-[15px] focus:outline-none" />
          </label>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto rounded-[18px] border border-border bg-card">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Family</th>
                    <th className="p-3 font-semibold">Children</th>
                    <th className="p-3 font-semibold">Stories this month</th>
                    <th className="p-3 font-semibold">No limit</th>
                    <th className="p-3 font-semibold">Joined</th>
                    <th className="p-3 font-semibold">Last listened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shown.map((f) => (
                    <tr key={f.user_id}>
                      <td className="p-3 font-semibold">{f.email}{f.founding_number ? <span className="ml-1 font-normal text-muted-foreground">#{f.founding_number}</span> : null}</td>
                      <td className="p-3">{kidsLine(f.children)}</td>
                      <td className={`p-3 ${!f.no_limit && f.stories_this_month >= limit ? "font-semibold text-destructive" : ""}`}>
                        {f.stories_this_month} of {f.no_limit ? "no limit" : limit}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={f.no_limit}
                          aria-label={`No limit for ${f.email}`}
                          onClick={() => toggleNoLimit(f)}
                          className={`relative h-7 w-12 rounded-full ${f.no_limit ? "bg-primary" : "bg-border"}`}
                        >
                          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${f.no_limit ? "left-[22px]" : "left-0.5"}`} />
                        </button>
                      </td>
                      <td className="p-3 text-muted-foreground">{when(f.signed_up_at)}</td>
                      <td className="p-3 text-muted-foreground">{ago(f.last_listened)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
};

// ======================================================================
// Reports
// ======================================================================
const REASON: Record<string, string> = {
  not_right: "Not right for my child",
  names_details: "Mistake in names or details",
  audio: "Audio problem",
  other: "Something else",
};
type Report = {
  id: string; created_at: string; reason: string; note: string | null; status: string; episode_number: number | null;
  story_id: string; story_title: string | null; is_library: boolean | null; parent_email: string | null;
};

export const AdminReports = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"open" | "done">("open");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async (): Promise<{ rows: Report[]; missing: boolean }> => {
      const { data, error } = await db.rpc("admin_reports");
      if (error) return { rows: [], missing: true };
      return { rows: data ?? [], missing: false };
    },
  });
  const rows = data?.rows ?? [];
  const open = rows.filter((r) => r.status !== "done");
  const list = tab === "open" ? open : rows.filter((r) => r.status === "done");

  const setStatus = async (r: Report, status: "replied" | "done") => {
    const { error } = await db.from("story_reports").update({ status }).eq("id", r.id);
    if (error) return toast.error("That didn’t save. Please try again.");
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  return (
    <AdminShell title="Reports" intro="Stories parents have flagged.">
      {data?.missing ? (
        <SetupNeeded />
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <Pill on={tab === "open"} onClick={() => setTab("open")}>Open · {open.length}</Pill>
            <Pill on={tab === "done"} onClick={() => setTab("done")}>Done</Pill>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-border bg-card p-6 text-[15px] text-muted-foreground">No reports here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((r) => (
                <li key={r.id} className="rounded-[18px] border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{REASON[r.reason] ?? r.reason}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === "new" ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                      {r.status === "new" ? "New" : r.status === "replied" ? "Replied" : "Done"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    “{r.story_title ?? "Story"}”{r.episode_number ? ` · Episode ${r.episode_number}` : ""} · {r.is_library ? "library" : "made for a family"} · from {r.parent_email ?? "unknown"} · {when(r.created_at)}
                  </div>
                  {r.note && <p className="mt-2 text-[15px]">“{r.note}”</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.parent_email && (
                      <a
                        href={`mailto:${r.parent_email}?subject=${encodeURIComponent(`About “${r.story_title ?? "your story"}” on LuluTales`)}`}
                        onClick={() => r.status === "new" && setStatus(r, "replied")}
                        className={`${btn} inline-flex items-center border border-border`}
                      >
                        Reply by email
                      </a>
                    )}
                    {r.status !== "done" && (
                      <button type="button" onClick={() => setStatus(r, "done")} className={`${btn} border border-border`}>
                        Mark as done
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AdminShell>
  );
};

// ======================================================================
// Settings
// ======================================================================
export const AdminSettings = () => {
  const qc = useQueryClient();
  const { data: s } = useSettings();
  const { data: types = [] } = useQuery({
    queryKey: ["admin-story-types"],
    queryFn: async () => {
      const { data } = await db.from("story_types").select("key, name, is_live, sort_order").order("sort_order");
      const { data: themes } = await db.from("story_themes").select("type_key");
      const counts: Record<string, number> = {};
      for (const t of themes ?? []) counts[t.type_key] = (counts[t.type_key] ?? 0) + 1;
      return (data ?? []).map((t: any) => ({ ...t, themes: counts[t.key] ?? 0 }));
    },
  });
  const [word, setWord] = useState("");

  const save = async (patch: Partial<Settings>) => {
    const { error } = await db.from("app_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", true);
    if (error) return toast.error("That didn’t save. Please try again.");
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
  };
  const setLive = async (key: string, is_live: boolean) => {
    if (is_live && !window.confirm("Make this story type visible to parents? It needs themes and its own writing instructions in the Story Engine first.")) return;
    const { error } = await db.from("story_types").update({ is_live }).eq("key", key);
    if (error) return toast.error("That didn’t save.");
    qc.invalidateQueries({ queryKey: ["admin-story-types"] });
  };

  if (!s) return <AdminShell title="Settings"><p className="text-sm text-muted-foreground">Loading…</p></AdminShell>;

  const Num = ({ label, sub, field }: { label: string; sub: string; field: "founding_places" | "monthly_story_limit" | "invite_bonus_stories" | "auto_approve_hours" }) => (
    <div className="flex items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-sm text-muted-foreground">{sub}</div>
      </div>
      <input
        type="number"
        min={0}
        defaultValue={s[field]}
        onBlur={(e) => {
          const v = Math.max(0, Math.round(Number(e.target.value)));
          if (v !== s[field]) save({ [field]: v } as Partial<Settings>);
        }}
        className="h-11 w-20 rounded-xl border border-border bg-background px-3 text-right font-semibold"
        aria-label={label}
      />
    </div>
  );

  return (
    <AdminShell title="Settings" intro="Changes apply straight away for every family.">
      <div className="flex max-w-[720px] flex-col gap-8">
        <section>
          <h2 className="mb-2.5 font-[Quicksand] text-[19px] font-bold">Access</h2>
          <div className="divide-y divide-border rounded-[18px] border border-border bg-card">
            <div className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Approve automatically</div>
                <div className="text-sm text-muted-foreground">If you don’t act, families get in on their own</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={s.auto_approve_enabled}
                onClick={() => save({ auto_approve_enabled: !s.auto_approve_enabled })}
                className={`relative h-7 w-12 flex-shrink-0 rounded-full ${s.auto_approve_enabled ? "bg-primary" : "bg-border"}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${s.auto_approve_enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            <Num label="Hours before approving automatically" sub="New families wait this long at most" field="auto_approve_hours" />
            <Num label="Founding places" sub={`Free until ${new Date(s.free_until).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`} field="founding_places" />
            <Num label="Stories per family each month" sub="Applies to every family unless No limit is on" field="monthly_story_limit" />
            <Num label="Extra stories for each friend invited" sub="Given to the person who invited" field="invite_bonus_stories" />
            <div className="p-4">
              <div className="font-semibold">Block list</div>
              <div className="mb-2.5 text-sm text-muted-foreground">Sign-ups whose email contains one of these are flagged in Requests for you to check.</div>
              <div className="flex flex-wrap gap-2">
                {(s.block_list ?? []).map((w) => (
                  <span key={w} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-muted pl-3 pr-1 text-sm font-semibold">
                    {w}
                    <button type="button" aria-label={`Remove ${w}`} onClick={() => save({ block_list: s.block_list.filter((x) => x !== w) })} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const w = word.trim().toLowerCase();
                    if (!w || s.block_list?.includes(w)) return;
                    save({ block_list: [...(s.block_list ?? []), w] });
                    setWord("");
                  }}
                >
                  <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="+ Add word" className="h-9 w-32 rounded-full border border-dashed border-border bg-background px-3 text-sm" />
                </form>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 font-[Quicksand] text-[19px] font-bold">Admins</h2>
          <div className="rounded-[18px] border border-border bg-card p-4 text-[15px]">
            aagam_jain2022@pgp.isb.edu · mylulutales@gmail.com · hello@lulutales.in
            <p className="mt-1 text-sm text-muted-foreground">To add or remove an admin, ask your tech help. It’s a database change on purpose.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 font-[Quicksand] text-[19px] font-bold">Story types</h2>
          <div className="divide-y divide-border rounded-[18px] border border-border bg-card">
            {types.map((t: any) => (
              <div key={t.key} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.themes} themes</div>
                </div>
                <span className={`text-sm font-semibold ${t.is_live ? "text-primary" : "text-muted-foreground"}`}>{t.is_live ? "Live" : "Hidden"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={t.is_live}
                  aria-label={`${t.name} live`}
                  onClick={() => setLive(t.key, !t.is_live)}
                  className={`relative h-7 w-12 flex-shrink-0 rounded-full ${t.is_live ? "bg-primary" : "bg-border"}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${t.is_live ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">A type stays hidden from parents until it’s Live. Each new type needs its own writing instructions in the Story Engine.</p>
        </section>
      </div>
    </AdminShell>
  );
};
