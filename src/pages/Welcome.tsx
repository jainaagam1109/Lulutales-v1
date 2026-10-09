import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import desktopHtml from "./welcome/desktop.html?raw";
import phoneHtml from "./welcome/phone.html?raw";
import "./welcome/welcome.css";

/**
 * Public welcome (sales) page shown at "/" to visitors who are not signed in.
 * The markup comes straight from the approved design (computer + phone versions);
 * this component only wires up the FAQ accordion and in-app links.
 */
const Welcome = () => {
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

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
