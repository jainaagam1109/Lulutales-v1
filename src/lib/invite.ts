import { supabase } from "@/integrations/supabase/client";

const KEY = "lulutales_invite_code";

export const storeInvite = (code: string) => {
  try {
    localStorage.setItem(KEY, code.trim().toUpperCase());
  } catch {
    /* ignore */
  }
};

export const pendingInvite = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/**
 * Use a stored invite code for the signed-in family. Returns true if it let them skip the wait.
 * Safe to call any number of times: the database only accepts one invite per family.
 */
export const redeemPendingInvite = async (): Promise<boolean> => {
  const code = pendingInvite();
  if (!code) return false;
  const { data, error } = await (supabase as any).rpc("redeem_invite", { _code: code });
  if (!error) {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  return !error && data === true;
};

/** This family's own invite code (created the first time it's asked for). */
export const fetchMyInviteCode = async (): Promise<string | null> => {
  const { data, error } = await (supabase as any).rpc("my_invite_code");
  return error ? null : ((data as string) ?? null);
};
