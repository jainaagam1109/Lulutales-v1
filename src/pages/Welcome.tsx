import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import desktopHtml from "./welcome/desktop.html?raw";
import phoneHtml from "./welcome/phone.html?raw";
import "./welcome/welcome.css";
import { useAuth } from "@/hooks/useAuth";
import { setupReviewCarousel, type ReviewCarousel } from "./welcome/reviewCarousel";

/**
 * Public welcome (sales) page shown at "/" to visitors who are not signed in.
 * The markup comes straight from the approved design (computer + phone versions);
 * this component only wires up the FAQ accordion and in-app links.
 */
const Welcome = () => {
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const { session } = useAuth();

  // A parent who is already signed in (e.g. from "About LuluTales") sees "Open the app",
  // not "Log in" / "Sign up free".
  useEffect(() => {
    const root = ref.current;
    if (!root || !session) return;
    root.querySelectorAll<HTMLAnchorElement>("a[href^='/auth']").forEach((a) => {
      if (a.getAttribute("href") === "/auth") {
        a.style.display = "none"; // the header "Log in" link
        return;
      }
      a.setAttribute("href", "/");
      a.textContent = "Open the app";
      const note = a.nextElementSibling as HTMLElement | null;
      if (note && /no card needed/i.test(note.textContent ?? "")) note.style.display = "none";
    });
  }, [session]);

  useEffect(() => {
    document.title = "LuluTales – Personalised Audio Stories for Kids, in English & Hindi";
    const root = ref.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const faqBtn = target.closest<HTMLButtonElement>("[data-faq]");
      if (faqBtn) {
        const id = faqBtn.dataset.faq!;
        const prefix = id.slice(0, 2);
        const wasOpen = faqBtn.getAttribute("aria-expanded") === "true";
        // Only one answer open at a time, per page version.
        root.querySelectorAll<HTMLButtonElement>(`[data-faq^="${prefix}"]`).forEach((b) => {
          const open = !wasOpen && b === faqBtn;
          b.setAttribute("aria-expanded", open ? "true" : "false");
          const icon = b.querySelector<SVGElement>("svg");
          if (icon) icon.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
          const panel = root.querySelector<HTMLElement>(`[data-faq-panel="${b.dataset.faq}"]`);
          if (panel) panel.hidden = !open;
        });
        return;
      }

      // Review row arrows (computer layout).
      const revBtn = target.closest<HTMLButtonElement>("[data-rev]");
      if (revBtn) {
        const row = revBtn.parentElement?.nextElementSibling as HTMLElement | null;
        const carousel = row ? carousels.get(row) : undefined;
        if (carousel) revBtn.dataset.rev === "next" ? carousel.next() : carousel.prev();
        return;
      }

      // Keep in-app links inside the app (no full page reload).
      const link = target.closest<HTMLAnchorElement>("a[href^='/']");
      if (link) {
        e.preventDefault();
        nav(link.getAttribute("href")!);
      }
    };

    // Parent reviews move on their own, round robin.
    const carousels = new Map<HTMLElement, ReviewCarousel>();
    root.querySelectorAll<HTMLElement>("[data-reviews]").forEach((row) => carousels.set(row, setupReviewCarousel(row)));

    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("click", onClick);
      carousels.forEach((c) => c.destroy());
    };
  }, [nav]);

  return (
    <div ref={ref} className="lt-welcome">
      <div className="lt-welcome-d" dangerouslySetInnerHTML={{ __html: desktopHtml }} />
      <div className="lt-welcome-m" dangerouslySetInnerHTML={{ __html: phoneHtml }} />
    </div>
  );
};

export default Welcome;
