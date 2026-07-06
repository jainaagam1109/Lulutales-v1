import { Link } from "react-router-dom";

export const SectionHeader = ({
  title,
  subtitle,
  seeAllTo,
  className = "",
}: {
  title: string;
  subtitle?: string;
  seeAllTo?: string;
  className?: string;
}) => (
  <div className={`mb-2 px-5 ${className}`}>
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {seeAllTo && (
        <Link to={seeAllTo} className="text-[11px] font-bold text-primary-deep">
          See all
        </Link>
      )}
    </div>
    {subtitle && (
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    )}
  </div>
);
