import { NavLink } from "react-router-dom";
import { LayoutDashboard, Heart, Sparkles } from "lucide-react";
import { MiniPlayer } from "./MiniPlayer";

const items = [
  { to: "/", label: "Home", icon: LayoutDashboard, premium: false },
  { to: "/happy-place", label: "My Happy Place", icon: Heart, premium: false },
  { to: "/magic-hub", label: "Magic Hub", icon: Sparkles, premium: false },
];

export const BottomNav = () => (
  <div className="sticky bottom-0 z-30 shrink-0">
    <MiniPlayer />
    <nav className="flex items-stretch justify-around gap-1 border-t border-border bg-surface/90 px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md">
      {items.map(({ to, label, icon: Icon, premium }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] uppercase tracking-wider transition-all ${
              isActive
                ? "bg-card text-primary-deep shadow-soft"
                : "text-muted-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`h-5 w-5 ${isActive ? "text-primary-deep" : ""}`} />
              <span className="flex items-center gap-1 text-center leading-tight">
                {label}
                {premium && (
                  <span className="rounded-full bg-tag-warm-bg px-1 py-px text-[7px] font-bold uppercase text-tag-warm-fg">
                    Premium
                  </span>
                )}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  </div>
);
