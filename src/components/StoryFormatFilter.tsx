import { useRef, KeyboardEvent } from "react";
import { LayoutGrid, Headphones, BookOpen, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StoryFormat = "all" | "audio" | "text";

type Segment = { key: StoryFormat; label: string; Icon: LucideIcon };

const SEGMENTS: Segment[] = [
  { key: "all", label: "All", Icon: LayoutGrid },
  { key: "audio", label: "Listen", Icon: Headphones },
  { key: "text", label: "Read", Icon: BookOpen },
];

type Props = {
  value: StoryFormat;
  onChange: (next: StoryFormat) => void;
  counts?: Partial<Record<StoryFormat, number>>;
  className?: string;
};

export const StoryFormatFilter = ({ value, onChange, counts, className }: Props) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveBy = (delta: number) => {
    const idx = SEGMENTS.findIndex((s) => s.key === value);
    const nextIdx = (idx + delta + SEGMENTS.length) % SEGMENTS.length;
    const next = SEGMENTS[nextIdx];
    onChange(next.key);
    refs.current[nextIdx]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      moveBy(-1);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      moveBy(1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Filter stories by format"
      className={cn(
        "flex w-full items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft",
        className
      )}
    >
      {SEGMENTS.map((seg, i) => {
        const active = seg.key === value;
        const count = counts?.[seg.key];
        const { Icon } = seg;
        return (
          <button
            key={seg.key}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(seg.key)}
            onKeyDown={onKeyDown}
            className={cn(
              "flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-colors",
              active
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-primary-deep"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{seg.label}</span>
            {typeof count === "number" && (
              <span className="text-[10px] font-semibold opacity-80">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StoryFormatFilter;
