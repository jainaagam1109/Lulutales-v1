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

/* ---------- Companion (single column, two inputs) ---------- */
export const COMPANION_TOOLTIP =
  "Tell us your child's favourite toy — the one they're actually attached to — and we'll write that one into the story instead of inventing something. Give its name (e.g. Nutty) and what it is (e.g. a stuffed squirrel). Have a pet? Add them in the family section above instead. Leave both blank and we'll invent a toy for you.";

export const splitCompanion = (raw?: string | null): { name: string; what: string } => {
  const s = (raw ?? "").trim();
  if (!s) return { name: "", what: "" };
  const i = s.indexOf(",");
  if (i === -1) return { name: s, what: "" };
  return { name: s.slice(0, i).trim(), what: s.slice(i + 1).trim() };
};

export const joinCompanion = (name: string, what: string): string | null => {
  const n = (name ?? "").trim();
  const w = (what ?? "").trim();
  if (n && w) return `${n}, ${w}`;
  return n || w || null;
};

export const CompanionFields = ({
  name,
  what,
  onChange,
}: {
  name: string;
  what: string;
  onChange: (next: { name: string; what: string }) => void;
}) => (
  <div className="space-y-3">
    <div>
      <FieldLabel optional tooltip={COMPANION_TOOLTIP}>
        Favourite toy's name
      </FieldLabel>
      <TextInput
        value={name}
        onChange={(e) => onChange({ name: e.target.value, what })}
        placeholder="e.g. Nutty"
        maxLength={40}
      />
    </div>
    <div>
      <FieldLabel optional tooltip={COMPANION_KIND_TOOLTIP}>
        What kind of toy is it?
      </FieldLabel>
      <TextInput
        value={what}
        onChange={(e) => onChange({ name, what: e.target.value })}
        placeholder="e.g. a rubber duck, a soft blanket, a money plant"
        maxLength={60}
      />
    </div>
  </div>
);

/* ================= Family members block (v2) ================= */

export const FAMILY_RELATIONS = [
  "Mother",
  "Father",
  "Elder brother",
  "Younger brother",
  "Elder sister",
  "Younger sister",
  "Uncle",
  "Aunt",
  "Cousin",
  "Grandfather",
  "Grandmother",
  "Teacher",
  "Friend",
  "Pet",
  "Other",
] as const;

export const AGE_RELATIONS = new Set([
  "Elder brother",
  "Younger brother",
  "Elder sister",
  "Younger sister",
  "Cousin",
  "Friend",
]);

export const RELATION_AGE_OPTIONS = [
  { label: "Baby — not talking yet", value: "baby" },
  { label: "Toddler, 1–2 years", value: "toddler" },
  { label: "3–4 years", value: "young_child" },
  { label: "5+ years", value: "older_child" },
];

export type FamilyRow = {
  relation: string;
  relation_custom?: string;
  term: string;
  age?: string;
};

export const DEFAULT_FAMILY_ROWS: FamilyRow[] = [
  { relation: "Mother", term: "Mummy" },
  { relation: "Father", term: "Papa" },
];

export const parseFamilyRows = (raw?: string | null): FamilyRow[] => {
  const s = (raw ?? "").trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr
          .filter((x) => x && typeof x === "object")
          .map((x: any) => {
            const rel = String(x.relation ?? "");
            const relType = String(x.relation_type ?? "");
            const known = (FAMILY_RELATIONS as readonly string[]).includes(relType);
            if (known && relType === "Pet") {
              const inner = rel.match(/^Pet\s*\((.*)\)\s*$/);
              return {
                relation: "Pet",
                relation_custom: inner ? inner[1].trim() : x.relation_custom ? String(x.relation_custom) : undefined,
                term: String(x.term ?? ""),
              } as FamilyRow;
            }
            if (known && relType === "Other") {
              return {
                relation: "Other",
                relation_custom: rel || (x.relation_custom ? String(x.relation_custom) : undefined),
                term: String(x.term ?? ""),
                age: x.age ? String(x.age) : undefined,
              } as FamilyRow;
            }
            return {
              relation: known ? relType : rel,
              relation_custom: x.relation_custom ? String(x.relation_custom) : undefined,
              term: String(x.term ?? ""),
              age: x.age ? String(x.age) : undefined,
            } as FamilyRow;
          })
          .slice(0, 10);
      }
    } catch {
      /* fall through */
    }
  }
  // legacy "Relation: Term" list
  return parseAddressTerms(s).map((t) => {
    const match = FAMILY_RELATIONS.find(
      (r) => r.toLowerCase() === t.relation.trim().toLowerCase()
    );
    return match && match !== "Other"
      ? { relation: match, term: t.term }
      : { relation: t.relation ? "Other" : "", relation_custom: t.relation || undefined, term: t.term };
  });
};

export const serializeFamilyRows = (rows: FamilyRow[]): string => {
  const clean = rows
    .filter((r) => r.relation.trim() && r.term.trim() && (r.relation !== "Other" || (r.relation_custom ?? "").trim()))
    .map((r) => {
      const custom = (r.relation_custom ?? "").trim();
      const relation =
        r.relation === "Other" ? custom : r.relation === "Pet" ? (custom ? `Pet (${custom})` : "Pet") : r.relation;
      return {
        relation,
        relation_type: r.relation,
        term: r.term.trim(),
        ...(r.age ? { age: r.age } : {}),
      };
    });
  return clean.length ? JSON.stringify(clean) : "";
};

export const isFamilyRowComplete = (r: FamilyRow) =>
  !!r.relation.trim() && !!r.term.trim() && (r.relation !== "Other" || !!(r.relation_custom ?? "").trim());

/** Best-effort conversion of legacy free-text family members + sibling age. */
const LEGACY_MAP: { words: string[]; relation: string }[] = [
  { words: ["mother", "mom", "mum", "mummy", "maa", "amma"], relation: "Mother" },
  { words: ["father", "dad", "papa", "daddy", "appa"], relation: "Father" },
  { words: ["elder sister", "big sister", "didi"], relation: "Elder sister" },
  { words: ["younger sister", "little sister"], relation: "Younger sister" },
  { words: ["sister", "behen"], relation: "Younger sister" },
  { words: ["elder brother", "big brother", "bhaiya", "bhai"], relation: "Elder brother" },
  { words: ["younger brother", "little brother"], relation: "Younger brother" },
  { words: ["brother"], relation: "Younger brother" },
  { words: ["grandmother", "grandma", "dadi", "nani"], relation: "Grandmother" },
  { words: ["grandfather", "grandpa", "dada", "nana"], relation: "Grandfather" },
  { words: ["uncle", "chacha", "mama"], relation: "Uncle" },
  { words: ["aunt", "aunty", "chachi", "mami"], relation: "Aunt" },
  { words: ["cousin"], relation: "Cousin" },
  { words: ["friend"], relation: "Friend" },
  { words: ["teacher"], relation: "Teacher" },
];

const SIBLING_RELATIONS = new Set([
  "Elder brother",
  "Younger brother",
  "Elder sister",
  "Younger sister",
]);

export const convertLegacyFamily = (
  familyMembers?: string | null,
  siblingAge?: number | string | null
): FamilyRow[] => {
  const text = (familyMembers ?? "").toLowerCase();
  if (!text.trim()) return [];
  const found: string[] = [];
  for (const entry of LEGACY_MAP) {
    if (entry.words.some((w) => text.includes(w)) && !found.includes(entry.relation)) {
      found.push(entry.relation);
    }
  }
  const rows: FamilyRow[] = found.slice(0, 10).map((relation) => ({ relation, term: "" }));
  const n = typeof siblingAge === "string" ? parseInt(siblingAge, 10) : siblingAge ?? NaN;
  if (Number.isFinite(n)) {
    const siblings = rows.filter((r) => SIBLING_RELATIONS.has(r.relation));
    if (siblings.length === 1) {
      const num = Number(n);
      siblings[0].age =
        num <= 0 ? "baby" : num <= 2 ? "toddler" : num <= 4 ? "young_child" : "older_child";
    }
  }
  return rows;
};

export const FamilyMembersEditor = ({
  value,
  onChange,
  max = 10,
}: {
  value: FamilyRow[];
  onChange: (next: FamilyRow[]) => void;
  max?: number;
}) => {
  const rows = value.length === 0 ? [{ relation: "", term: "" } as FamilyRow] : value;

  useEffect(() => {
    if (value.length === 0) onChange([{ relation: "", term: "" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (i: number, patch: Partial<FamilyRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => {
    if (rows.length >= max) return;
    onChange([...rows, { relation: "", term: "" }]);
  };

  const takenAt = (i: number) =>
    new Set(
      rows
        .filter((r, idx) => idx !== i && r.relation && r.relation !== "Other" && r.relation !== "Pet")
        .map((r) => r.relation)
    );

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const taken = takenAt(i);
        const options = FAMILY_RELATIONS.filter(
          (r) => r === "Other" || r === "Pet" || r === row.relation || !taken.has(r)
        ).map((r) => ({ label: r, value: r }));
        const isPet = row.relation === "Pet";
        return (
          <div key={i} className="rounded-xl border border-border/70 bg-background/40 p-2.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Select
                  value={row.relation}
                  onChange={(v) =>
                    update(i, {
                      relation: v,
                      relation_custom:
                        v === "Other" || v === "Pet" ? row.relation_custom ?? "" : undefined,
                      age: AGE_RELATIONS.has(v) ? row.age : undefined,
                    })
                  }
                  options={options}
                  placeholder="Select relation"
                />
                {row.relation === "Other" && (
                  <input
                    value={row.relation_custom ?? ""}
                    onChange={(e) => update(i, { relation_custom: e.target.value })}
                    placeholder="Relation (e.g. Neighbour)"
                    maxLength={40}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                  />
                )}
                <input
                  value={row.term}
                  onChange={(e) => update(i, { term: e.target.value })}
                  placeholder={isPet ? "Pet's name (e.g. Bruno)" : "Called (e.g. Mummy)"}
                  aria-label={isPet ? "Pet's name" : "Called"}
                  maxLength={40}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                />
                {isPet && (
                  <input
                    value={row.relation_custom ?? ""}
                    onChange={(e) => update(i, { relation_custom: e.target.value })}
                    placeholder="What kind? (e.g. a dog, a cat, a rabbit)"
                    maxLength={40}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                  />
                )}
                {AGE_RELATIONS.has(row.relation) && (
                  <div>
                    <div className="mb-1 text-[10px] font-semibold text-muted-foreground">
                      How old are they? <span className="font-normal">(optional)</span>
                    </div>
                    <Select
                      value={row.age ?? ""}
                      onChange={(v) => update(i, { age: v || undefined })}
                      options={RELATION_AGE_OPTIONS}
                      placeholder="Select age"
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={rows.length === 1}
                className="mt-1.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
      {rows.length < max && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-[11px] font-bold text-primary-deep"
        >
          <Plus className="h-3.5 w-3.5" /> Add another ({rows.length}/{max})
        </button>
      )}
    </div>
  );
};

/* ---------- Companion kind tooltip ---------- */

export const COMPANION_KIND_TOOLTIP =
  "The favourite toy is the sidekick who shares the adventure and provides the story's funniest moment.";
