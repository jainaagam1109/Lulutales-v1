import { supabase } from "@/integrations/supabase/client";

export type ActiveProfile = {
  id: string;
  name: string;
  age: number;
} | null;

const KEY_ID = "lulutales_profile_id";
const KEY_NAME = "lulutales_child_name";
const KEY_AGE = "lulutales_child_age";

const cp = () => (supabase as any).from("child_profiles");

export const cacheActiveProfile = (p: { id: string; name: string; age: number } | null) => {
  if (!p) {
    localStorage.removeItem(KEY_ID);
    localStorage.removeItem(KEY_NAME);
    localStorage.removeItem(KEY_AGE);
    return;
  }
  localStorage.setItem(KEY_ID, p.id);
  localStorage.setItem(KEY_NAME, p.name);
  localStorage.setItem(KEY_AGE, String(p.age));
};

export const loadActiveProfileForUser = async (userId: string): Promise<ActiveProfile> => {
  const { data } = await cp()
    .select("id, name, age")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  const row = data?.[0];
  if (!row) {
    cacheActiveProfile(null);
    return null;
  }
  const p = { id: row.id as string, name: row.name as string, age: row.age as number };
  cacheActiveProfile(p);
  return p;
};

export const softDeleteProfile = async (profileId: string): Promise<string | null> => {
  const { data, error } = await (supabase as any).rpc("soft_delete_profile", { _profile_id: profileId });
  if (error) throw error;
  const nextId = (data as string | null) ?? null;
  if (nextId) {
    const { data: row } = await cp().select("id, name, age").eq("id", nextId).maybeSingle();
    if (row) cacheActiveProfile({ id: row.id, name: row.name, age: row.age });
  } else {
    cacheActiveProfile(null);
  }
  return nextId;
};

export const fetchDeletedProfileIdsForUser = async (userId: string): Promise<string[]> => {
  const { data } = await cp().select("id").eq("user_id", userId).eq("status", "deleted");
  return (data ?? []).map((r: any) => r.id as string);
};
