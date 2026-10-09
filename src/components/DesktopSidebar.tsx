import { NavLink, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { LuluLogo } from "@/components/LuluLogo";
import { ProfileSwitcherChip } from "@/components/ProfileAvatarButton";
import { NAV_ITEMS } from "@/components/BottomNav";

/** Left-hand menu shown on computers (md and up). Phones use BottomNav instead. */
export const DesktopSidebar = () => {
  const nav = useNavigate();
  return (
    <aside className="hidden h-full w-[248px] shrink-0 flex-col gap-6 border-r border-border bg-card px-5 py-7 md:flex">
      <div className="px-1.5">
        <LuluLogo size={34} />
      </div>
      <button
        type="button"
        onClick={() => nav("/magic-hub")}
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        <Plus className="h-4 w-4" /> Make a story
      </button>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] transition-colors ${
                isActive ? "bg-primary/10 font-semibold text-primary" : "text-foreground/80 hover:bg-muted"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 rounded-2xl bg-background p-3.5">
        <span className="text-xs text-muted-foreground">Listening for</span>
        <div>
          <ProfileSwitcherChip />
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
