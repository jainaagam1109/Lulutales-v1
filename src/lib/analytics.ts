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
  const { data } = await supabase
    .from("story_analytics")
    .select("story_id, stories(theme)")
    .eq("profile_id", profileId)
    .eq("event_type", "complete");
  if (!data) return [];
  const seen = new Set<string>();
  const themes = new Set<string>();
  for (const row of data as any[]) {
    if (seen.has(row.story_id)) continue;
    seen.add(row.story_id);
    const theme = row.stories?.theme;
    if (theme) themes.add(String(theme).toLowerCase());
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

const THEME_EMOJI: Record<string, string> = {
  friendship: "🤝",
  adventure: "🗺️",
  bedtime: "🌙",
  kindness: "💗",
  courage: "🦁",
  curiosity: "🔭",
  family: "🏡",
  nature: "🌿",
  magic: "✨",
};

export const computeBadgesFromDb = (
  storiesCompleted: number,
  completedThemes: string[],
  bestStreak: number
): Badge[] => {
  const badges: Badge[] = [];
  if (storiesCompleted >= 1) {
    badges.push({ id: "first-story", emoji: "🌟", label: "First story" });
  }
  for (const theme of completedThemes) {
    badges.push({
      id: `theme-${theme}`,
      emoji: THEME_EMOJI[theme] ?? "🎨",
      label: `${theme.charAt(0).toUpperCase()}${theme.slice(1)} explorer`,
    });
  }
  for (const tier of STREAK_TIERS) {
    if (bestStreak >= tier.days) {
      badges.push({ id: `streak-${tier.days}`, emoji: tier.emoji, label: tier.label });
    }
  }
  return badges;
};
