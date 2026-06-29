type Variant = "warm" | "cool" | "mint";

const palettes: Variant[] = ["warm", "cool", "mint"];

export const tagVariantFor = (s: string): Variant => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
};

const cls: Record<Variant, string> = {
  warm: "bg-tag-warm-bg text-tag-warm-fg border-tag-warm-border",
  cool: "bg-tag-cool-bg text-tag-cool-fg border-tag-cool-border",
  mint: "bg-tag-mint-bg text-tag-mint-fg border-tag-mint-border",
};

export const TagChip = ({ label, variant }: { label: string; variant?: Variant }) => {
  const v = variant ?? tagVariantFor(label);
  return (
    <span
      className={`inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls[v]}`}
    >
      {label}
    </span>
  );
};
