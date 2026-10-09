import { useMemo, useState } from "react";

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const inWords = (n: number) => {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10), o = n % 10;
  return o ? `${TENS[t]}-${ONES[o]}` : TENS[t];
};

const KEY = "lulutales_parent_ok";

/** True once a grown-up has passed the check during this visit. */
export const parentCheckPassed = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Light "grown-ups only" check: type a number written in words.
 * Asked once per visit (until the browser tab is closed).
 */
export const ParentCheck = ({
  reason = "A quick check before making a new story.",
  onPass,
  onCancel,
}: {
  reason?: string;
  onPass: () => void;
  onCancel: () => void;
}) => {
  const n = useMemo(() => 21 + Math.floor(Math.random() * 78), []);
  const [val, setVal] = useState("");
  const [wrong, setWrong] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (val.trim() === String(n)) {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* private mode: ask again next time */
      }
      onPass();
    } else {
      setWrong(true);
      setVal("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 md:items-center" role="dialog" aria-modal="true" aria-labelledby="pc-title">
      <form onSubmit={submit} className="w-full max-w-[420px] rounded-t-[28px] bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:rounded-[28px]">
        <h2 id="pc-title" className="font-[Quicksand] text-[22px] font-bold text-foreground">Grown-ups only</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">{reason}</p>
        <p className="mt-4 text-[15px] text-foreground">
          Type this number using digits: <strong className="font-semibold">{inWords(n)}</strong>
        </p>
        <input
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={val}
          onChange={(e) => {
            setVal(e.target.value.replace(/\D/g, ""));
            setWrong(false);
          }}
          aria-label="Number in digits"
          aria-invalid={wrong}
          className="mt-3 h-14 w-full rounded-2xl border border-border bg-background px-4 text-center font-[Quicksand] text-2xl font-bold text-foreground focus:border-primary focus:outline-none"
        />
        {wrong && <p className="mt-2 text-sm !text-destructive">That’s not quite it. Try again.</p>}
        <button type="submit" disabled={!val} className="mt-4 w-full bg-primary text-primary-foreground disabled:opacity-50">
          Continue
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">We’ll ask once per visit.</p>
        <button type="button" onClick={onCancel} className="mt-1 min-h-11 w-full text-sm font-semibold text-primary">
          Not now
        </button>
      </form>
    </div>
  );
};

export default ParentCheck;
