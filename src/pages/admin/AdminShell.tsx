import { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { LuluLogo } from "@/components/LuluLogo";

const TABS = [
  { to: "/admin", label: "Requests", end: true },
  { to: "/admin/families", label: "Families" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/upload", label: "Upload a story" },
  { to: "/admin/health", label: "Story health" },
];

/** Frame for the admin screens: left menu on computers, a scrolling tab row on phones. Always light. */
export const AdminShell = ({ title, intro, children, actions }: { title: string; intro?: ReactNode; children: ReactNode; actions?: ReactNode }) => (
  <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
    <aside className="hidden w-[232px] shrink-0 flex-col gap-6 border-r border-border bg-card px-5 py-7 md:flex">
      <div className="flex items-center gap-2">
        <LuluLogo size={30} />
      </div>
      <span className="-mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</span>
      <nav className="flex flex-col gap-1" aria-label="Admin">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex min-h-11 items-center rounded-2xl px-3.5 text-[15px] ${isActive ? "bg-primary/10 font-semibold text-primary" : "text-foreground/80 hover:bg-muted"}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Link to="/" className="mt-auto text-sm font-semibold text-primary">← Back to the app</Link>
    </aside>
    <div className="min-w-0 flex-1">
      <div className="flex gap-2 overflow-x-auto border-b border-border bg-card px-4 py-2 scrollbar-hide md:hidden">
        <Link to="/" className="flex min-h-10 shrink-0 items-center px-2 text-sm font-semibold text-primary">← App</Link>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex min-h-10 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ${isActive ? "bg-foreground text-background" : "text-foreground/80"}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <main className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-10 md:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[Quicksand] text-[28px] font-bold">{title}</h1>
            {intro && <p className="mt-1 max-w-[640px] text-[15px] text-muted-foreground">{intro}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  </div>
);

export const Stat = ({ n, label }: { n: ReactNode; label: string }) => (
  <div className="rounded-[18px] border border-border bg-card p-4">
    <div className="font-[Quicksand] text-[26px] font-bold">{n}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

export const Pill = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${on ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}
  >
    {children}
  </button>
);

export const SetupNeeded = () => (
  <div className="rounded-[18px] border border-dashed border-border bg-card p-6 text-[15px] text-muted-foreground">
    This list needs the admin database step (supabase/manual/step8_admin_view.sql). Once it’s run, families appear here.
  </div>
);
