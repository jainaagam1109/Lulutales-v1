import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Email links ("mailto:") do nothing on laptops without a mail app set up.
 * Whenever one is clicked anywhere in the app or welcome page, we also copy the
 * address and say so, so the parent is never left with a click that does nothing.
 */
export const EmailLinkHelper = () => {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.<HTMLAnchorElement>('a[href^="mailto:"]');
      if (!a) return;
      const address = decodeURIComponent(a.getAttribute("href")!.slice(7).split("?")[0]);
      if (!address) return;
      const done = () =>
        toast.success(`${address} copied`, {
          description: "If your email app didn’t open, paste it into a new email.",
        });
      try {
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(address).then(done, done);
        else done();
      } catch {
        done();
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
};
