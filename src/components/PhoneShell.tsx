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
}: {
  children: ReactNode;
  statusBar?: boolean;
  withNav?: boolean;
}) => (
  <div className="flex h-[100dvh] w-full bg-background">
    {withNav && <DesktopSidebar />}
    <div
      className={`mx-auto flex h-full w-full min-w-0 flex-col overflow-hidden ${
        withNav ? "max-w-[430px] md:max-w-[960px]" : "max-w-[430px] md:max-w-[560px]"
      }`}
    >
      {children}
    </div>
  </div>
);
