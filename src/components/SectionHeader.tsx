import { Link } from "react-router-dom";

export const SectionHeader = ({
  title,
  seeAllTo,
  className = "",
}: {
  title: string;
  seeAllTo?: string;
  className?: string;
}) => (
  <div className={`mb-2 flex items-center justify-between px-5 ${className}`}>
    <h2 className="text-[11px] font-semibold text-muted-foreground">{title}</h2>
    {seeAllTo && (
      <Link to={seeAllTo} className="text-[11px] font-bold text-primary-deep">
        See all
      </Link>
    )}
  </div>
);
