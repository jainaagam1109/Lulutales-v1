// Anonymous funnel tracking. Insert-only into visitor_events; fire-and-forget.
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

const VISITOR_KEY = "lulutales_visitor_id";
const SRC_KEY = "lulutales_visitor_src";
const LANDED_KEY = "lulutales_landed";
const FIRST_PLAY_KEY = "lulutales_first_story_played";

let memoryVisitorId: string | null = null;
let memorySrc: string | null = null;
let memoryLanded = false;
let initialAuthTracked = false;

// Reuse the managed client's public configuration, never its session or tokens.
// An anonymous transport must not wait for preview auth/storage initialization.
const publicConfig = supabase as unknown as { supabaseUrl: string; supabaseKey: string };
const anonymousClient = createClient(publicConfig.supabaseUrl, publicConfig.supabaseKey, {
  accessToken: async () => null,
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const getVisitorId = (): string => {
  try {
    const storedId = localStorage.getItem(VISITOR_KEY);
    if (storedId) memoryVisitorId = storedId;
  } catch {
    // Keep the same in-memory ID if storage cannot be read.
  }
  if (!memoryVisitorId) memoryVisitorId = crypto.randomUUID();
  try {
    localStorage.setItem(VISITOR_KEY, memoryVisitorId);
  } catch {
    // Storage may be readable but not writable.
  }
  return memoryVisitorId;
};

const getSrc = (): string | null => {
  try {
    memorySrc = memorySrc ?? sessionStorage.getItem(SRC_KEY);
  } catch {
    // The source captured from the URL remains available without storage.
  }
  return memorySrc;
};

const send = (eventName: string): void => {
  try {
    void anonymousClient
      .from("visitor_events")
      .insert({ visitor_id: getVisitorId(), event_name: eventName, src: getSrc() })
      .then(() => {}, () => {});
  } catch {
    // never let tracking break anything
  }
};

/** Once per browser session: record the landing, capturing ?src= or utm_source. */
export const trackLanded = (): void => {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("src") ?? params.get("utm_source");
  if (source !== null) memorySrc = source.trim().slice(0, 100) || null;
  else getSrc();
  try {
    if (memorySrc !== null) sessionStorage.setItem(SRC_KEY, memorySrc);
  } catch {
    // Source capture never depends on storage succeeding.
  }
  if (memoryLanded) return;
  try {
    if (sessionStorage.getItem(LANDED_KEY)) {
      memoryLanded = true;
      return;
    }
  } catch {
    // Deduplicate within this page when session storage is unavailable.
  }
  memoryLanded = true;
  try {
    sessionStorage.setItem(LANDED_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
  send("landed");
};

/** Capture direct auth loads before React/auth initialization can fail. */
export const trackInitialAuthViewed = (): void => {
  if (window.location.pathname !== "/auth") return;
  initialAuthTracked = true;
  send("auth_viewed");
};

export const trackAuthViewed = (): void => {
  if (initialAuthTracked) {
    initialAuthTracked = false;
    return;
  }
  send("auth_viewed");
};

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
