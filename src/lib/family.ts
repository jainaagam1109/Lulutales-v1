import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FamilyStatus = "approved" | "waiting" | "blocked";
export type Allowance = { used: number; monthly_limit: number; bonus: number; remaining: number; no_limit: boolean };

/**
 * Family access + this month's story allowance.
 * Families with no access record yet (e.g. signed up through the old screen during the
 * redesign) are treated as approved so nobody is wrongly locked out.
 */
export const useFamily = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["family", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: access }, { data: allow }] = await Promise.all([
        (supabase as any).from("family_access").select("status, auto_approve_at").eq("user_id", user!.id).maybeSingle(),
        (supabase as any).rpc("family_story_allowance", { _user_id: user!.id }),
      ]);
      const a = Array.isArray(allow) ? allow[0] : allow;
      return {
        status: ((access?.status as FamilyStatus) ?? "approved") as FamilyStatus,
        autoApproveAt: (access?.auto_approve_at as string | null) ?? null,
        allowance: (a ?? null) as Allowance | null,
      };
    },
  });
  const allowance = data?.allowance ?? null;
  const total = allowance ? allowance.monthly_limit + allowance.bonus : 5;
  return {
    loading: isLoading,
    status: data?.status ?? "approved",
    autoApproveAt: data?.autoApproveAt ?? null,
    allowance,
    total,
    remaining: allowance ? (allowance.no_limit ? Infinity : allowance.remaining) : total,
    used: allowance?.used ?? 0,
    noLimit: !!allowance?.no_limit,
  };
};

/** "10 October" style date. */
export const formatDay = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
};

export const nextMonthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString("en-IN", { day: "numeric", month: "long" });
};
