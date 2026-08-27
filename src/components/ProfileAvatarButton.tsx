import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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

type Kid = { id: string; name: string; status: string };

export const ProfileSwitcherChip = () => {
  const nav = useNavigate();
  const { user } = useAuth();

  const { data: kids } = useQuery({
    queryKey: ["switcher-child-profiles", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Kid[]> => {
      const { data } = await (supabase as any)
        .from("child_profiles")
        .select("id, name, status")
        .eq("user_id", user!.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: true });
      return (data ?? []) as Kid[];
    },
  });

  if (!user || !kids) return null;

  if (kids.length === 0) {
    return (
      <button
        onClick={() => nav("/add-child")}
        className="flex items-center gap-1 rounded-full border border-dashed border-border bg-card px-2.5 py-1 text-[11px] font-bold text-primary-deep"
      >
        <Plus className="h-3 w-3" /> Add child
      </button>
    );
  }

  const active = kids.find((k) => k.status === "active") ?? kids[0];
  const firstName = (active.name ?? "").trim().split(/\s+/)[0] || active.name;

  return (
    <button
      onClick={() => nav("/select-profile")}
      aria-label="Switch child profile"
      className="flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-1 pr-2 text-[11px] font-bold text-foreground"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-extrabold text-primary-foreground">
        {firstName.charAt(0).toUpperCase()}
      </span>
      <span className="max-w-[86px] truncate">{firstName}</span>
      <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
    </button>
  );
};
