import { ReactNode } from "react";
import { Signal, Wifi, BatteryFull } from "lucide-react";

export const PhoneShell = ({ children, statusBar = false }: { children: ReactNode; statusBar?: boolean }) => (
  <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden border-x border-[hsl(var(--border))] bg-gradient-card shadow-soft sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-[2.25rem] sm:border">
    {statusBar && (
      <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-bold text-foreground/80">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <Signal className="h-3 w-3" />
          <Wifi className="h-3 w-3" />
          <BatteryFull className="h-3.5 w-3.5" />
        </div>
      </div>
    )}
    {children}
  </div>
);
