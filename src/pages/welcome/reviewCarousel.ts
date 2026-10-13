/**
 * "What parents are saying": an endlessly looping row of review cards.
 * - Moves one card at a time on its own (laptop shows 3, phone shows 1).
 * - After the last review, the first one comes round again (round robin, no jump back).
 * - Pauses while the parent hovers, touches or focuses it, when it is off screen,
 *   and never auto-moves for people who have asked their device for reduced motion.
 * - The ← → arrows (laptop) and swiping (phone) still work.
 */
const INTERVAL_MS = 4500;

export type ReviewCarousel = { next: () => void; prev: () => void; destroy: () => void };

export function setupReviewCarousel(row: HTMLElement): ReviewCarousel {
  const originals = Array.from(row.children).filter((el) => el.tagName === "FIGURE") as HTMLElement[];
  const n = originals.length;
  if (n < 2) return { next() {}, prev() {}, destroy() {} };

  // Copies of the cards at the end make the loop seamless: when we reach the copy of
  // card 1 we silently hop back to the real card 1.
  const clones = originals.map((el) => {
    const c = el.cloneNode(true) as HTMLElement;
    c.setAttribute("aria-hidden", "true");
    c.dataset.clone = "1";
    c.querySelectorAll("a, button, [tabindex]").forEach((x) => x.setAttribute("tabindex", "-1"));
    row.appendChild(c);
    return c;
  });

  const step = () => {
    const a = row.children[0] as HTMLElement | undefined;
    const b = row.children[1] as HTMLElement | undefined;
    return a && b ? b.offsetLeft - a.offsetLeft : row.clientWidth;
  };
  const index = () => Math.round(row.scrollLeft / Math.max(1, step()));
  const jump = (i: number) => {
    const prevSnap = row.style.scrollSnapType;
    row.style.scrollSnapType = "none";
    row.scrollTo({ left: i * step(), behavior: "auto" });
    row.style.scrollSnapType = prevSnap;
  };
  const glide = (i: number) => row.scrollTo({ left: i * step(), behavior: "smooth" });

  // Once a move settles on a copy, hop to the matching real card.
  let settleTimer: number | undefined;
  const settle = () => {
    const i = index();
    if (i >= n) jump(i - n);
  };
  const onScroll = () => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settle, 140);
  };
  row.addEventListener("scroll", onScroll, { passive: true });

  const next = () => {
    let i = index();
    if (i >= n) {
      jump(i - n);
      i -= n;
    }
    glide(i + 1);
  };
  const prev = () => {
    let i = index();
    if (i <= 0) {
      jump(n);
      i = n;
    }
    glide(i - 1);
  };

  // ---- automatic movement ----
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let hovered = false;
  let visible = false;
  let timer: number | undefined;
  const run = () => {
    window.clearInterval(timer);
    timer = undefined;
    if (reduce || hovered || !visible || document.hidden) return;
    timer = window.setInterval(next, INTERVAL_MS);
  };
  const pause = () => {
    hovered = true;
    run();
  };
  const resume = () => {
    hovered = false;
    run();
  };
  row.addEventListener("mouseenter", pause);
  row.addEventListener("mouseleave", resume);
  row.addEventListener("focusin", pause);
  row.addEventListener("focusout", resume);
  row.addEventListener("touchstart", pause, { passive: true });
  row.addEventListener("touchend", resume, { passive: true });
  const onVisibility = () => run();
  document.addEventListener("visibilitychange", onVisibility);

  const io =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          (entries) => {
            visible = entries.some((e) => e.isIntersecting);
            run();
          },
          { threshold: 0.4 }
        )
      : null;
  if (io) io.observe(row);
  else {
    visible = true;
    run();
  }

  return {
    next,
    prev,
    destroy() {
      window.clearInterval(timer);
      window.clearTimeout(settleTimer);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      row.removeEventListener("scroll", onScroll);
      row.removeEventListener("mouseenter", pause);
      row.removeEventListener("mouseleave", resume);
      row.removeEventListener("focusin", pause);
      row.removeEventListener("focusout", resume);
      row.removeEventListener("touchstart", pause);
      row.removeEventListener("touchend", resume);
      clones.forEach((c) => c.remove());
    },
  };
}
