// src/lib/track.ts
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "lulutales_session_id";
const LAST_SEEN_KEY = "lulutales_session_last_seen";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min idle = new session

export const getSessionId = (): string => {
  if (typeof window === "undefined") return "ssr";
  const now = Date.now();
  const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) ?? "0", 10);
  let sid = localStorage.getItem(SESSION_KEY);
  const isNewSession = !sid || !lastSeen || now - lastSeen > SESSION_TIMEOUT_MS;
  if (isNewSession) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
    void track("app_open", { referrer: document.referrer || null });
  }
  localStorage.setItem(LAST_SEEN_KEY, String(now));
  return sid;
};

export const track = async (
  eventName: string,
  properties: Record<string, unknown> = {}
): Promise<void> => {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? null;
    if (!userId) return;
    const profileId = localStorage.getItem("lulutales_profile_id");
    await supabase.from("app_events").insert({
      user_id: userId,
      profile_id: profileId,
      event_name: eventName,
      properties,
      session_id: localStorage.getItem(SESSION_KEY) ?? "unknown",
    } as never);
  } catch (err) {
    if (import.meta.env.DEV) console.warn("track failed:", eventName, err);
  }
};

export const trackPageView = (path: string, routePattern?: string): void => {
  getSessionId();
  void track("page_view", { path, route: routePattern ?? path });
};
