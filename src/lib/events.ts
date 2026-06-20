import { supabase } from "@/integrations/supabase/client";

export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
) {
  try {
    const profileId = localStorage.getItem("lulutales_profile_id");

    let sessionId = sessionStorage.getItem("lulutales_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("lulutales_session_id", sessionId);
    }

    void (supabase as any).from("app_events").insert({
      event_name: eventName,
      properties: properties ?? {},
      profile_id: profileId,
      session_id: sessionId,
    } as any);
  } catch (err) {
    // Fire-and-forget: log only, never throw
    // eslint-disable-next-line no-console
    console.error("trackEvent failed:", err);
  }
}
