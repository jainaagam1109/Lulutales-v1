import { supabase } from "@/integrations/supabase/client";

// Local-timezone YYYY-MM-DD from a Date or ISO string
const localDateKey = (input: string | Date): string => {
  const d = typeof input === "string" ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// All-time consecutive-day streak ending today (or yesterday if not heard yet today)
export const fetchStreak = async (profileId: string): Promise<number> => {
  const { data } = await supabase
    .from("story_analytics")
    .select("created_at")
    .eq("profile_id", profileId)
    .in("event_type", ["play", "complete"]);
  if (!data || data.length === 0) return 0;

  const days = new Set(data.map((r) => localDateKey(r.created_at)));
  const d = new Date();
  if (!days.has(localDateKey(d))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (days.has(localDateKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
};

// All-time distinct stories completed
export const fetchStoriesCompleted = async (profileId: string): Promise<number> => {
  const { data } = await supabase
    .from("story_analytics")
    .select("story_id")
    .eq("profile_id", profileId)
    .eq("event_type", "complete");
  if (!data) return 0;
  return new Set(data.map((r) => r.story_id)).size;
};

// All-time distinct themes across completed stories (returns lowercased theme strings)
export const fetchCompletedThemes = async (profileId: string): Promise<string[]> => {
  const { data: events } = await supabase
    .from("story_analytics")
    .select("story_id")
    .eq("profile_id", profileId)
    .eq("event_type", "complete");
  if (!events || events.length === 0) return [];
  const storyIds = Array.from(new Set(events.map((r) => r.story_id)));
  const { data: stories } = await supabase
    .from("stories")
    .select("theme")
    .in("id", storyIds);
  if (!stories) return [];
  const themes = new Set<string>();
  for (const s of stories) {
    if (s.theme) themes.add(String(s.theme).toLowerCase());
  }
  return Array.from(themes);
};

// Best historical streak — needed for streak-tier badges
export const fetchBestStreak = async (profileId: string): Promise<number> => {
  const { data } = await supabase
    .from("story_analytics")
    .select("created_at")
    .eq("profile_id", profileId)
    .in("event_type", ["play", "complete"]);
  if (!data || data.length === 0) return 0;

  const days = Array.from(new Set(data.map((r) => localDateKey(r.created_at)))).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const day of days) {
    const d = new Date(day);
    if (prev) {
      const diff = Math.round((d.getTime() - prev.getTime()) / 86_400_000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = d;
  }
  return best;
};

// Badge types and computation (replaces computeBadges from @/lib/progress for DB-backed flows)
export type Badge = { id: string; emoji: string; label: string };

const STREAK_TIERS = [
  { days: 7, emoji: "🔥", label: "7-day streak" },
  { days: 15, emoji: "⚡", label: "15-day streak" },
  { days: 30, emoji: "🌙", label: "30-day streak" },
  { days: 50, emoji: "🏅", label: "50-day streak" },
  { days: 75, emoji: "💫", label: "75-day streak" },
  { days: 100, emoji: "👑", label: "100-day streak" },
];

import { loadBuckets } from "@/hooks/useThemeBuckets";
import { getBucketMeta } from "./bucketConfig";

export const computeBadgesFromDb = (
  storiesCompleted: number,
  completedThemes: string[],
  bestStreak: number,
  bucketMap: Map<string, string>
): Badge[] => {
  const badges: Badge[] = [];
  if (storiesCompleted >= 1) {
    badges.push({ id: "first-story", emoji: "🌟", label: "First story" });
  }
  const seenBuckets = new Set<string>();
  for (const theme of completedThemes) {
    const bucket = bucketMap.get(String(theme).trim().toLowerCase());
    if (!bucket || seenBuckets.has(bucket)) continue;
    seenBuckets.add(bucket);
    const meta = getBucketMeta(bucket);
    badges.push({ id: `bucket-${bucket}`, emoji: meta.emoji, label: meta.badgeLabel });
  }
  for (const tier of STREAK_TIERS) {
    if (bestStreak >= tier.days) {
      badges.push({ id: `streak-${tier.days}`, emoji: tier.emoji, label: tier.label });
    }
  }
  return badges;
};

// Total time spent across all events (play + complete), in seconds.
export const fetchScreenTimeSeconds = async (profileId: string): Promise<number> => {
  const { data } = await supabase
    .from("story_analytics")
    .select("duration_seconds")
    .eq("profile_id", profileId)
    .in("event_type", ["play", "complete"]);
  if (!data) return 0;
  return data.reduce((sum, r: any) => sum + (r.duration_seconds || 0), 0);
};

export type BucketBar = {
  bucket: string;
  storyCount: number;
  pct: number;
};

const aggregateBuckets = async (
  profileId: string,
  sinceIso: string | null
): Promise<{ bucket: string; storyCount: number }[]> => {
  let q = supabase
    .from("story_analytics")
    .select("story_id, created_at")
    .eq("profile_id", profileId)
    .eq("event_type", "complete");
  if (sinceIso) q = q.gte("created_at", sinceIso);
  const { data: events } = await q;
  if (!events || events.length === 0) return [];

  const uniqueStoryIds = Array.from(new Set(events.map((e: any) => e.story_id)));
  const { data: stories } = await supabase
    .from("stories")
    .select("id, theme")
    .in("id", uniqueStoryIds);
  if (!stories) return [];

  const themeByStoryId = new Map<string, string>();
  for (const s of stories as any[]) {
    if (s.theme) themeByStoryId.set(s.id, String(s.theme));
  }

  const buckets = await loadBuckets();
  const agg = new Map<string, Set<string>>();
  for (const sid of uniqueStoryIds) {
    const theme = themeByStoryId.get(sid);
    if (!theme) continue;
    const bucket = buckets.get(theme.trim().toLowerCase());
    if (!bucket) continue;
    let cur = agg.get(bucket);
    if (!cur) {
      cur = new Set();
      agg.set(bucket, cur);
    }
    cur.add(sid);
  }

  return Array.from(agg.entries())
    .map(([bucket, ids]) => ({ bucket, storyCount: ids.size }))
    .filter((r) => r.storyCount > 0)
    .sort((a, b) => b.storyCount - a.storyCount);
};

export const fetchBucketBreakdown = async (profileId: string): Promise<BucketBar[]> => {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  let ranked = await aggregateBuckets(profileId, since);
  if (ranked.length === 0) {
    ranked = await aggregateBuckets(profileId, null);
  }
  ranked = ranked.slice(0, 4);
  if (ranked.length === 0) return [];
  const top = ranked[0].storyCount;
  return ranked.map((r) => ({
    bucket: r.bucket,
    storyCount: r.storyCount,
    pct: Math.max(8, Math.round((r.storyCount / top) * 100)),
  }));
};

