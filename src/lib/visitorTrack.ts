// Anonymous funnel tracking. Insert-only into visitor_events; fire-and-forget.
import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "lulutales_visitor_id";
const SRC_KEY = "lulutales_visitor_src";
const LANDED_KEY = "lulutales_landed";
const FIRST_PLAY_KEY = "lulutales_first_story_played";

let memoryVisitorId: string | null = null;

const getVisitorId = (): string => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    if (!memoryVisitorId) memoryVisitorId = crypto.randomUUID();
    return memoryVisitorId;
  }
};

const getSrc = (): string | null => {
  try {
    return sessionStorage.getItem(SRC_KEY);
  } catch {
    return null;
  }
};

const send = (eventName: string): void => {
  try {
    void (supabase as any)
      .from("visitor_events")
      .insert({ visitor_id: getVisitorId(), event_name: eventName, src: getSrc() })
      .then(() => {});
  } catch {
    // never let tracking break anything
  }
};

/** Once per browser session: record the landing, capturing ?src= or utm_source. */
export const trackLanded = (): void => {
  try {
    if (sessionStorage.getItem(LANDED_KEY)) return;
    sessionStorage.setItem(LANDED_KEY, "1");
    const params = new URLSearchParams(window.location.search);
    const src = (params.get("src") ?? params.get("utm_source") ?? "").slice(0, 100).trim();
    if (src) sessionStorage.setItem(SRC_KEY, src);
  } catch {
    // sessionStorage unavailable — still send the event without src
  }
  send("landed");
};

export const trackAuthViewed = (): void => send("auth_viewed");

export const trackSignedUp = (): void => send("signed_up");

/** Fires once per browser, the first time any story starts playing. */
export const trackFirstStoryPlayed = (): void => {
  try {
    if (localStorage.getItem(FIRST_PLAY_KEY)) return;
    localStorage.setItem(FIRST_PLAY_KEY, "1");
  } catch {
    // storage unavailable — send anyway
  }
  send("first_story_played");
};
