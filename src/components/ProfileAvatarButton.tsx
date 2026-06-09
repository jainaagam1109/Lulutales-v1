import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const ProfileAvatarButton = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "•";
  return (
    <button
      onClick={() => nav("/profile")}
      aria-label="Open profile"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-base font-extrabold text-primary-foreground shadow-soft ring-2 ring-card"
    >
      {initial}
    </button>
  );
};
