import { ReactNode, useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Info, Plus, X } from "lucide-react";

/* ---------- Validation helpers ---------- */
export const isLettersOnly = (v: string) => v.trim().length > 0 && /^[A-Za-z\s'-]+$/.test(v.trim());
export const isNumeric = (v: string) => v.trim().length > 0 && /^\d+$/.test(v.trim());

export type ValidationState = "untouched" | "valid" | "error";

/* ---------- Label + Tooltip ---------- */
export const FieldLabel = ({
  children,
  tooltip,
  optional,
}: {
  children: ReactNode;
  tooltip?: string;
  optional?: boolean;
}) => (
  <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
    <span>{children}</span>
    {optional && <span className="font-normal normal-case tracking-normal text-muted-foreground/70">(optional)</span>}
    {tooltip && <InfoTooltip text={tooltip} />}
  </div>
);

export const InfoTooltip = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const open = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const margin = 8;
      const width = Math.min(240, window.innerWidth - margin * 2);
      let left = r.left + r.width / 2 - width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      setPos({ top: r.bottom + 6, left, width });
    }
    setShow(true);
  };
  const close = () => setShow(false);

  // Dismiss tooltip on any scroll (window or scrollable ancestor) and on resize,
  // so it doesn't stick in a stale position when the user scrolls the page.
  useEffect(() => {
    if (!show) return;
    const onScroll = () => close();
    const onResize = () => close();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [show]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onClick={(e) => {
          e.preventDefault();
          show ? close() : open();
        }}
        className="flex items-center text-muted-foreground hover:text-primary-deep"
        aria-label="More info"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {show && pos && (
        <div
          role="tooltip"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="pointer-events-none fixed z-50 rounded-xl border border-border bg-card p-2.5 text-[11px] normal-case tracking-normal text-foreground shadow-soft"
        >
          {text}
        </div>
      )}
    </>
  );
};


/* ---------- Pill (kept) ---------- */
export const Pill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
      active
        ? "border-primary bg-gradient-primary text-primary-foreground"
        : "border-border bg-card text-muted-foreground hover:border-primary/40"
    }`}
  >
    {children}
  </button>
);

/* ---------- Validated Text Input ---------- */
type ValidatedInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  state?: ValidationState;
  errorMessage?: string;
};

export const TextInput = ({ state = "untouched", errorMessage, className, ...rest }: ValidatedInputProps) => {
  const ring =
    state === "error"
      ? "border-destructive focus:border-destructive"
      : state === "valid"
      ? "border-tag-mint-border focus:border-tag-mint-border"
      : "border-border focus:border-primary";
  return (
    <div>
      <div className="relative">
        <input
          {...rest}
          className={`w-full rounded-xl border bg-card px-3 py-2.5 pr-9 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none ${ring} ${className ?? ""}`}
        />
        {state === "valid" && (
          <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tag-mint-fg" />
        )}
      </div>
      {state === "error" && errorMessage && (
        <p className="mt-1 text-[11px] text-destructive">{errorMessage}</p>
      )}
    </div>
  );
};

/* ---------- Select (native, styled) ---------- */
type SelectProps = {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  state?: ValidationState;
};

export const Select = ({ value, onChange, options, placeholder = "Select…", state = "untouched" }: SelectProps) => {
  const ring =
    state === "error"
      ? "border-destructive"
      : state === "valid"
      ? "border-tag-mint-border"
      : "border-border focus-within:border-primary";
  return (
    <div className={`relative rounded-xl border bg-card ${ring}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl bg-transparent px-3 py-2.5 pr-9 text-sm text-foreground focus:outline-none"
      >
        <option value="" disabled className="text-muted-foreground">
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
};

/* ---------- Collapsible Section ---------- */
export const Section = ({
  title,
  subtitle,
  optional,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  optional?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border bg-card shadow-soft ${
        optional ? "opacity-95" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-foreground">{title}</span>
            {optional && (
              <span className="text-[10px] font-normal text-muted-foreground/70">(optional)</span>
            )}
          </div>
          {subtitle && <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 px-4 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Family Address Terms editor ---------- */
export type AddressTerm = { relation: string; term: string };

export const parseAddressTerms = (raw: string): AddressTerm[] => {
  if (!raw) return [];
  const s = raw.trim();
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr
          .filter((x) => x && typeof x === "object")
          .map((x: any) => ({ relation: String(x.relation ?? ""), term: String(x.term ?? "") }))
          .slice(0, 10);
      }
    } catch {
      /* fall through */
    }
  }
  // legacy comma/newline separated "Relation: Term"
  return s
    .split(/[\n,]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((p) => {
      const [rel, ...rest] = p.split(":");
      return { relation: (rel ?? "").trim(), term: rest.join(":").trim() };
    });
};

export const serializeAddressTerms = (terms: AddressTerm[]): string => {
  const clean = terms.filter((t) => t.relation.trim() || t.term.trim());
  return clean.length ? JSON.stringify(clean) : "";
};

export const AddressTermsEditor = ({
  value,
  onChange,
  max = 10,
}: {
  value: AddressTerm[];
  onChange: (next: AddressTerm[]) => void;
  max?: number;
}) => {
  const update = (i: number, patch: Partial<AddressTerm>) => {
    const next = value.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    onChange(next);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => {
    if (value.length >= max) return;
    onChange([...value, { relation: "", term: "" }]);
  };
  const rows = value.length === 0 ? [{ relation: "", term: "" }] : value;
  // ensure controlled rendering if empty
  useEffect(() => {
    if (value.length === 0) onChange([{ relation: "", term: "" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={row.relation}
            onChange={(e) => update(i, { relation: e.target.value })}
            placeholder="Relation (e.g. Mother)"
            className="w-1/2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <input
            value={row.term}
            onChange={(e) => update(i, { term: e.target.value })}
            placeholder="Called (e.g. Mummy)"
            className="w-1/2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={rows.length === 1 && !row.relation && !row.term}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {value.length < max && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-[11px] font-bold text-primary-deep"
        >
          <Plus className="h-3.5 w-3.5" /> Add another ({value.length}/{max})
        </button>
      )}
    </div>
  );
};
