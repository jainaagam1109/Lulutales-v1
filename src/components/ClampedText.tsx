import { useLayoutEffect, useRef, useState } from "react";

/**
 * A paragraph cut to a few lines, with "Read more" only when the text is actually cut off.
 * (On wide screens a long summary often fits completely; then no button is shown.)
 */
export const ClampedText = ({ text, lines = 5, className = "" }: { text: string; lines?: number; className?: string }) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (open) return;
      setOverflows(el.scrollHeight - el.clientHeight > 2);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [text, open]);

  return (
    <>
      <p
        ref={ref}
        className={className}
        style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {text}
      </p>
      {(overflows || open) && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 min-h-10 text-sm font-semibold text-primary">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
};
