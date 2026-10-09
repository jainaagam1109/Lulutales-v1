import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Look = "light" | "dark" | "auto";
export type ParentSettings = { sleep_timer_minutes: number; autoplay_next_story: boolean; look: Look };

const DEFAULTS: ParentSettings = { sleep_timer_minutes: 0, autoplay_next_story: false, look: "light" };

// Copies kept on this device so the player and the colour scheme can react instantly,
// even before the saved settings have loaded.
const K = {
  autoplay: "lulutales_autoplay_enabled", // read by lib/autoplayQueue
  look: "lulutales_look",
  sleep: "lulutales_sleep_timer",
};

const writeLocal = (s: ParentSettings) => {
  try {
    localStorage.setItem(K.autoplay, s.autoplay_next_story ? "1" : "0");
    localStorage.setItem(K.look, s.look);
    localStorage.setItem(K.sleep, String(s.sleep_timer_minutes));
    window.dispatchEvent(new Event("lulutales-settings"));
  } catch {
    /* storage blocked: settings still apply after the next load */
  }
};

export const localLook = (): Look => {
  try {
    const v = localStorage.getItem(K.look);
    return v === "dark" || v === "auto" ? v : "light";
  } catch {
    return "light";
  }
};

export const localSleepMinutes = (): number => {
  try {
    const n = Number(localStorage.getItem(K.sleep));
    return [15, 30, 45].includes(n) ? n : 0;
  } catch {
    return 0;
  }
};

/** Is it "night" for the "Dark at night" look (7 pm to 7 am)? */
export const isNight = (d = new Date()) => d.getHours() >= 19 || d.getHours() < 7;

/** The family's listening and look settings, saved to their account. */
export const useParentSettings = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["parent-settings", user?.id];

  const { data, isLoading } = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async (): Promise<ParentSettings> => {
      const { data } = await (supabase as any)
        .from("parent_settings")
        .select("sleep_timer_minutes, autoplay_next_story, look")
        .eq("user_id", user!.id)
        .maybeSingle();
      const s: ParentSettings = data
        ? {
            sleep_timer_minutes: Number(data.sleep_timer_minutes) || 0,
            autoplay_next_story: !!data.autoplay_next_story,
            look: (data.look as Look) ?? "light",
          }
        : DEFAULTS;
      writeLocal(s);
      return s;
    },
  });

  const settings = data ?? DEFAULTS;

  const update = async (patch: Partial<ParentSettings>) => {
    if (!user) return;
    const next = { ...settings, ...patch };
    qc.setQueryData(key, next);
    writeLocal(next);
    const { error } = await (supabase as any)
      .from("parent_settings")
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      console.error("[parentSettings] save failed", error);
      qc.invalidateQueries({ queryKey: key });
      throw error;
    }
  };

  return { settings, loading: isLoading, update };
};
