import { NavLink } from "react-router-dom";
import { Home, Library, Heart, User } from "lucide-react";
import { MiniPlayer } from "./MiniPlayer";

export const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: Library },
  { to: "/my-stories", label: "My stories", icon: Heart },
  { to: "/profile", label: "Parents", icon: User },
];

export const BottomNav = () => (
  <div className="sticky bottom-0 z-30 shrink-0">
    <MiniPlayer />
    <nav className="flex md:hidden items-stretch justify-around gap-1 border-t border-border bg-surface/90 px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] transition-all ${
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground"
            }`
          }
        >
          <Icon className="h-5 w-5" />
          <span className="text-center leading-tight">{label}</span>
        </NavLink>
      ))}
    </nav>
  </div>
);
