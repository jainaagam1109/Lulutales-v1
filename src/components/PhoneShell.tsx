import { ReactNode } from "react";
import { DesktopSidebar } from "@/components/DesktopSidebar";

/**
 * Page frame.
 * - Phones: full screen, as before.
 * - Computers (md+): no phone-shaped box. Pages with the main menu (withNav) get the
 *   left-hand menu and a wide content column; other pages (sign-in, forms, player)
 *   sit in a comfortable centred column.
 */
export const PhoneShell = ({
  children,
  withNav = false,
  wide = false,
}: {
  children: ReactNode;
  statusBar?: boolean;
  withNav?: boolean;
  /** Computers only: use the full width (player and story page lay out side by side). */
  wide?: boolean;
}) => (
  // Computers, menu pages: the whole window scrolls (scroll bar at the window edge, and the
  // mouse wheel works anywhere), while the left menu stays put.
  <div className={`flex h-[100dvh] w-full bg-background ${withNav ? "md:overflow-y-auto" : ""}`}>
    {withNav && (
      <div className="hidden md:sticky md:top-0 md:block md:h-[100dvh] md:shrink-0">
        <DesktopSidebar />
      </div>
    )}
    <div
      className={`mx-auto flex h-full w-full min-w-0 flex-col overflow-hidden ${
        withNav
          ? "max-w-[430px] md:h-auto md:min-h-full md:max-w-[960px] md:overflow-visible md:[&>main]:overflow-visible"
          : wide
            ? "max-w-[430px] md:max-w-[1120px]"
            : "max-w-[430px] md:max-w-[560px]"
      }`}
    >
      {children}
    </div>
  </div>
);
