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
// "Active on day X" = ANY story_analytics row for this profile on that day.
export const fetchStreak = async (profileId: string): Promise<number> => {
  const { data } = await supabase
    .from("story_analytics")
    .select("created_at")
    .eq("profile_id", profileId);
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

const WORDS_PER_MINUTE = 130;

// Set of story_ids that count as "finished" for this profile.
// Audio: last episode of the story reached >= 90% via 'progress' pings.
// Text:  'bedtime' 'complete' row where time on page >= 80% of estimated reading time.
export const getCompletedStoryIds = async (profileId: string): Promise<Set<string>> => {
  const finished = new Set<string>();

  // --- Audio ---
  const { data: progress } = await (supabase as any)
    .from("story_analytics")
    .select("episode_id, position_seconds, duration_seconds")
    .eq("profile_id", profileId)
    .eq("event_type", "progress");

  const rows = ((progress ?? []) as any[]).filter((r) => r.episode_id);
  const episodeIds = Array.from(new Set(rows.map((r) => r.episode_id as string)));

  if (episodeIds.length > 0) {
    const { data: episodes } = await (supabase as any)
      .from("episodes")
      .select("id, story_id, episode_number")
      .in("id", episodeIds);

    const epById = new Map<string, { story_id: string; episode_number: number }>();
    for (const e of (episodes ?? []) as any[]) {
      epById.set(e.id, { story_id: e.story_id, episode_number: e.episode_number ?? 0 });
    }

    // Last episode number per story (from the full episodes list of those stories)
    const storyIds = Array.from(new Set(Array.from(epById.values()).map((e) => e.story_id)));
    const lastEpisodeByStory = new Map<string, number>();
    if (storyIds.length > 0) {
      const { data: allEps } = await (supabase as any)
        .from("episodes")
        .select("story_id, episode_number")
        .in("story_id", storyIds);
      for (const e of (allEps ?? []) as any[]) {
        const n = e.episode_number ?? 0;
        const cur = lastEpisodeByStory.get(e.story_id);
        if (cur === undefined || n > cur) lastEpisodeByStory.set(e.story_id, n);
      }
    }

    for (const r of rows) {
      const ep = epById.get(r.episode_id as string);
      if (!ep) continue;
      if (lastEpisodeByStory.get(ep.story_id) !== ep.episode_number) continue;
      const dur = Number(r.duration_seconds ?? 0);
      const pos = Number(r.position_seconds ?? 0);
      if (dur > 0 && pos >= 0.9 * dur) finished.add(ep.story_id);
    }
  }

  // --- Text (bedtime) ---
  const { data: bedtime } = await (supabase as any)
    .from("story_analytics")
    .select("story_id, duration_seconds")
    .eq("profile_id", profileId)
    .eq("event_type", "complete")
    .eq("source", "bedtime");

  const bedtimeRows = ((bedtime ?? []) as any[]).filter((r) => r.story_id);
  if (bedtimeRows.length > 0) {
    const ids = Array.from(new Set(bedtimeRows.map((r) => r.story_id as string)));
    const { data: stories } = await (supabase as any)
      .from("stories")
      .select("id, story_text")
      .in("id", ids);
    const textById = new Map<string, string>();
    for (const s of (stories ?? []) as any[]) textById.set(s.id, s.story_text ?? "");

    for (const r of bedtimeRows) {
      const text = textById.get(r.story_id as string) ?? "";
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      if (words === 0) continue;
      const estimated = (words / WORDS_PER_MINUTE) * 60;
      if (Number(r.duration_seconds ?? 0) >= 0.8 * estimated) finished.add(r.story_id as string);
    }
  }

  return finished;
};

// All-time distinct stories completed
export const fetchStoriesCompleted = async (profileId: string): Promise<number> => {
  return (await getCompletedStoryIds(profileId)).size;
};

// All-time distinct themes across completed stories (returns lowercased theme strings)
export const fetchCompletedThemes = async (profileId: string): Promise<string[]> => {
  const storyIds = Array.from(await getCompletedStoryIds(profileId));
  if (storyIds.length === 0) return [];
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
export type Badge = { id: string; emoji: string; label: string; description: string };

const STREAK_TIERS = [
  { days: 7, emoji: "🔥", label: "7-day streak" },
  { days: 15, emoji: "⚡", label: "15-day streak" },
  { days: 30, emoji: "🌙", label: "30-day streak" },
  { days: 50, emoji: "🏅", label: "50-day streak" },
  { days: 75, emoji: "💫", label: "75-day streak" },
  { days: 100, emoji: "👑", label: "100-day streak" },
];

import { getBucketMeta } from "./bucketConfig";

export const computeBadgesFromDb = (
  storiesCompleted: number,
  completedThemes: string[],
  bestStreak: number,
  bucketMap: Map<string, string>
): Badge[] => {
  const badges: Badge[] = [];
  if (storiesCompleted >= 1) {
    badges.push({
      id: "first-story",
      emoji: "🌟",
      label: "First story",
      description: "Awarded for finishing your first story.",
    });
  }
  const seenBuckets = new Set<string>();
  for (const theme of completedThemes) {
    const bucket = bucketMap.get(String(theme).trim().toLowerCase());
    if (!bucket || seenBuckets.has(bucket)) continue;
    seenBuckets.add(bucket);
    const meta = getBucketMeta(bucket);
    badges.push({
      id: `bucket-${bucket}`,
      emoji: meta.emoji,
      label: meta.badgeLabel,
      description: `Awarded for exploring the "${bucket}" life skill for the first time.`,
    });
  }
  for (const tier of STREAK_TIERS) {
    if (bestStreak >= tier.days) {
      badges.push({
        id: `streak-${tier.days}`,
        emoji: tier.emoji,
        label: tier.label,
        description: `Awarded for listening on ${tier.days} days in a row.`,
      });
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

// Active days in the rolling last-7-day window (local timezone). Includes today.
// Returns count + length-7 boolean array oldest→today (index 0 = 6 days ago, 6 = today).
export const fetchActiveDaysLast7 = async (
  profileId: string
): Promise<{ active: number; days: boolean[] }> => {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("story_analytics")
    .select("created_at")
    .eq("profile_id", profileId)
    .in("event_type", ["play", "complete"])
    .gte("created_at", since.toISOString());

  const seen = new Set<string>();
  for (const r of data ?? []) seen.add(localDateKey((r as any).created_at));

  const days: boolean[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    days.push(seen.has(localDateKey(cursor)));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { active: days.filter(Boolean).length, days };
};

import { BUCKETS, type BucketKey } from "@/lib/themeCatalog";

export type BucketBar = {
  bucket: BucketKey;
  label: string;
  storyCount: number;
  pct: number;
};

// Group completed stories by stories.bucket_key. Returns every bucket with ≥1 completed story.
export const fetchBucketBreakdown = async (profileId: string): Promise<BucketBar[]> => {
  const { data: events } = await supabase
    .from("story_analytics")
    .select("story_id")
    .eq("profile_id", profileId)
    .eq("event_type", "complete");
  if (!events || events.length === 0) return [];

  const uniqueStoryIds = Array.from(new Set(events.map((e: any) => e.story_id)));
  const { data: stories } = await (supabase as any)
    .from("stories")
    .select("id, bucket_key")
    .in("id", uniqueStoryIds);
  if (!stories) return [];

  const agg = new Map<BucketKey, Set<string>>();
  for (const s of stories as any[]) {
    const k = s.bucket_key as BucketKey | null;
    if (!k || !BUCKETS[k]) continue;
    let cur = agg.get(k);
    if (!cur) {
      cur = new Set();
      agg.set(k, cur);
    }
    cur.add(s.id);
  }

  const ranked = Array.from(agg.entries())
    .map(([bucket, ids]) => ({ bucket, storyCount: ids.size }))
    .filter((r) => r.storyCount > 0)
    .sort((a, b) => b.storyCount - a.storyCount);
  if (ranked.length === 0) return [];

  const top = ranked[0].storyCount;
  return ranked.map((r) => ({
    bucket: r.bucket,
    label: BUCKETS[r.bucket].fullName,
    storyCount: r.storyCount,
    pct: Math.max(8, Math.round((r.storyCount / top) * 100)),
  }));
};

export type BucketBadgeProgress = {
  bucket: BucketKey;
  bucketName: string;
  storyCount: number;
  tiers: { label: string; threshold: number; earned: boolean }[];
};

const BADGE_THRESHOLDS = [1, 3, 5] as const;

// For each of the 13 buckets, count distinct completed stories (across all story types)
// and report which of the 3 tier badges are earned at 1 / 3 / 5 distinct stories.
export const fetchBadgeProgress = async (profileId: string): Promise<BucketBadgeProgress[]> => {
  const { data: events } = await supabase
    .from("story_analytics")
    .select("story_id")
    .eq("profile_id", profileId)
    .eq("event_type", "complete");

  const counts = new Map<BucketKey, Set<string>>();
  for (const k of Object.keys(BUCKETS) as BucketKey[]) counts.set(k, new Set());

  const uniqueStoryIds = Array.from(new Set((events ?? []).map((e: any) => e.story_id)));
  if (uniqueStoryIds.length > 0) {
    const { data: stories } = await (supabase as any)
      .from("stories")
      .select("id, bucket_key")
      .in("id", uniqueStoryIds);
    for (const s of (stories ?? []) as any[]) {
      const k = s.bucket_key as BucketKey | null;
      if (!k || !BUCKETS[k]) continue;
      counts.get(k)!.add(s.id);
    }
  }

  return (Object.keys(BUCKETS) as BucketKey[]).map((k) => {
    const def = BUCKETS[k];
    const c = counts.get(k)!.size;
    return {
      bucket: k,
      bucketName: def.fullName,
      storyCount: c,
      tiers: def.badges.map((label, i) => ({
        label,
        threshold: BADGE_THRESHOLDS[i],
        earned: c >= BADGE_THRESHOLDS[i],
      })),
    };
  });
};

