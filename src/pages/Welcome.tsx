import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import desktopHtml from "./welcome/desktop.html?raw";
import phoneHtml from "./welcome/phone.html?raw";
import "./welcome/welcome.css";
import { useAuth } from "@/hooks/useAuth";

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
    document.title = "LuluTales – Stories that help your child grow";
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
        if (row?.hasAttribute("data-reviews")) {
          const step = row.clientWidth * 0.8;
          row.scrollBy({ left: revBtn.dataset.rev === "next" ? step : -step, behavior: "smooth" });
        }
        return;
      }

      // Keep in-app links inside the app (no full page reload).
      const link = target.closest<HTMLAnchorElement>("a[href^='/']");
      if (link) {
        e.preventDefault();
        nav(link.getAttribute("href")!);
      }
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [nav]);

  return (
    <div ref={ref} className="lt-welcome">
      <div className="lt-welcome-d" dangerouslySetInnerHTML={{ __html: desktopHtml }} />
      <div className="lt-welcome-m" dangerouslySetInnerHTML={{ __html: phoneHtml }} />
    </div>
  );
};

export default Welcome;
