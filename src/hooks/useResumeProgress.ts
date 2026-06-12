import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlaybackProgressRow = {
  id: string;
  profile_id: string;
  story_id: string;
  episode_id: string | null;
  episode_number: number | null;
  position_seconds: number;
  duration_seconds: number | null;
  percent: number;
  completed: boolean;
  updated_at: string;
};

const POS_KEY = (pid: string, sid: string, ep: number) =>
  `lulutales_pos_${pid}_${sid}_${ep}`;
const PCT_KEY = (pid: string, sid: string) => `lulutales_story_pct_${pid}_${sid}`;
const LAST_STORY_KEY = (pid: string) => `lulutales_last_story_${pid}`;
const LAST_EP_KEY = (pid: string, sid: string) => `lulutales_last_ep_${pid}_${sid}`;
const COMPLETED_KEY = (pid: string, sid: string) =>
  `lulutales_completed_${pid}_${sid}`;

const readNum = (v: string | null): number => {
  if (!v) return 0;
  const n = parseInt(v, 10);
  return isFinite(n) && n > 0 ? n : 0;
};

/**
 * Fetches the latest non-completed playback_progress row for the active profile.
 * Seeds localStorage ONCE per profileId (server-wins on switch, no-rewind guard).
 * Background refetches do NOT re-seed.
 */
export function useResumeProgress(profileId: string | null) {
  const seededFor = useRef<string | null>(null);

  const query = useQuery<PlaybackProgressRow | null>({
    queryKey: ["resume-progress", profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data, error } = await supabase
        .from("playback_progress" as any)
        .select("*")
        .eq("profile_id", profileId)
        .eq("completed", false)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (error) return null;
      const row = (data?.[0] as PlaybackProgressRow | undefined) ?? null;
      return row;
    },
    enabled: !!profileId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!profileId) return;
    if (query.isLoading) return;
    if (seededFor.current === profileId) return; // only seed on first resolve / profile switch
    seededFor.current = profileId;

    const row = query.data;
    if (!row) return;

    // Don't surface completed stories.
    if (row.completed) return;

    const pid = profileId;
    const sid = row.story_id;
    const ep = row.episode_number ?? 1;

    // Last-story pointer.
    localStorage.setItem(LAST_STORY_KEY(pid), sid);
    // Don't carry a stale "completed" flag from this device.
    localStorage.removeItem(COMPLETED_KEY(pid, sid));
    localStorage.setItem(LAST_EP_KEY(pid, sid), String(ep));

    // No-rewind guard on position.
    const localPos = readNum(localStorage.getItem(POS_KEY(pid, sid, ep)));
    const serverPos = Math.floor(row.position_seconds || 0);
    if (serverPos > localPos) {
      localStorage.setItem(POS_KEY(pid, sid, ep), String(serverPos));
    }

    // No-rewind guard on whole-story percent.
    const localPct = readNum(localStorage.getItem(PCT_KEY(pid, sid)));
    const serverPct = Math.max(0, Math.min(100, Math.floor(row.percent || 0)));
    if (serverPct > localPct) {
      localStorage.setItem(PCT_KEY(pid, sid), String(serverPct));
    }

    // Nudge MiniPlayer to re-read.
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: LAST_STORY_KEY(pid) }));
    } catch {
      // Some browsers disallow constructing StorageEvent; fall back to a custom event.
      window.dispatchEvent(new Event("storage"));
    }
  }, [profileId, query.isLoading, query.data]);

  return query;
}
