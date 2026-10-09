import { ReactNode } from "react";
import { Link } from "react-router-dom";

export const SectionHeader = ({
  title,
  subtitle,
  seeAllTo,
  right,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  seeAllTo?: string;
  right?: ReactNode;
  className?: string;
}) => (
  <div className={`mb-2.5 ${className}`}>
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-[Quicksand] text-[19px] font-bold text-foreground">{title}</h2>
      {seeAllTo && (
        <Link to={seeAllTo} className="shrink-0 text-sm font-semibold text-primary">
          See all
        </Link>
      )}
      {right}
    </div>
    {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
  </div>
);
