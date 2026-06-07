import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ProfileAvatarButton } from "@/components/ProfileAvatarButton";

type PageHeaderProps = {
  showBack?: boolean;
  backTo?: string;
  showProfile?: boolean;
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
};

export const PageHeader = ({
  showBack = true,
  backTo,
  showProfile = true,
  eyebrow,
  title,
  subtitle,
  children,
}: PageHeaderProps) => {
  const nav = useNavigate();
  const handleBack = () => {
    if (backTo) nav(backTo);
    else nav(-1);
  };

  return (
    <header className="px-5 pt-4 pb-3">
      <div className="mb-3 flex items-center justify-between">
        {showBack ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-xs text-primary-deep"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <span aria-hidden className="h-4 w-4" />
        )}
        {showProfile ? <ProfileAvatarButton /> : <span aria-hidden />}
      </div>

      {eyebrow && <div className="text-xs text-muted-foreground">{eyebrow}</div>}
      {title && (
        <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
      )}
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      {children}
    </header>
  );
};

export default PageHeader;
