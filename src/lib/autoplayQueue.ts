import { supabase } from "@/integrations/supabase/client";
import type { Story } from "@/lib/stories";
import { isRenderable } from "@/lib/storyStatus";
import { parseAgeRange } from "@/lib/recommend";

const AUTOPLAY_PREF_KEY = "lulutales_autoplay_enabled";

/** Autoplay is ON by default; only an explicit "0" turns it off. */
export const isAutoplayEnabled = (): boolean => {
  try {
    return localStorage.getItem(AUTOPLAY_PREF_KEY) !== "0";
  } catch {
    return true;
  }
};

export const setAutoplayEnabled = (v: boolean) => {
  try {
    localStorage.setItem(AUTOPLAY_PREF_KEY, v ? "1" : "0");
  } catch {}
};

/** Played-this-session set. In-memory only: closing the tab/app clears it. */
const played = new Set<string>();

export const markStoryPlayed = (id: string) => {
  if (id) played.add(id);
};
export const hasPlayedThisSession = (id: string) => played.has(id);
export const resetAutoplaySession = () => played.clear();

export const AUTOPLAY_MAX_ADVANCES = 3;

export const isAutoplayStory = (t: string | null | undefined) =>
  t === "personalised_audio" || t === "pre_recorded";

const ageOk = (s: Story, childAge: number | null) => {
  if (childAge == null) return true;
  const r = parseAgeRange(s.age_group ?? null);
  if (!r) return true;
  return r[0] <= childAge + 1 && r[1] >= childAge - 1;
};

const storyHasAudio = async (storyId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from("episodes")
      .select("id, audio_url")
      .eq("story_id", storyId)
      .limit(50);
    return (data ?? []).some((e: any) => !!e.audio_url);
  } catch {
    return false;
  }
};

/**
 * Ordered candidate list for the current autoplay run:
 *  1. this child's personalised audio stories, newest first, unplayed this session
 *  2. pre-recorded stories for the child's age, one universe at a time
 *     (starting with the current story's universe when we're already inside one)
 *  3. pre-recorded stories with no universe (fallback pool)
 *  4. once everything is exhausted, loop back to the start of the universe list
 */
const buildCandidates = async (opts: {
  profileId: string | null;
  childAge: number | null;
  current: Story;
}): Promise<Story[]> => {
  const { profileId, childAge, current } = opts;
  const out: Story[] = [];

  if (profileId) {
    try {
      const { data } = await supabase
        .from("stories")
        .select("*")
        .eq("child_profile_id", profileId)
        .eq("story_type", "personalised_audio")
        .order("created_at", { ascending: false });
      out.push(
        ...((data ?? []) as Story[]).filter(
          (s) => isRenderable(s) && s.id !== current.id && !played.has(s.id),
        ),
      );
    } catch {}
  }

  let pool: Story[] = [];
  try {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("story_type", "pre_recorded")
      .order("created_at", { ascending: true });
    pool = ((data ?? []) as Story[]).filter((s) => isRenderable(s) && ageOk(s, childAge));
  } catch {}

  const groups = new Map<string, Story[]>();
  const orphans: Story[] = [];
  for (const s of pool) {
    const u = (s as any).universe_id as string | null | undefined;
    if (u) {
      const arr = groups.get(u) ?? [];
      arr.push(s);
      groups.set(u, arr);
    } else {
      orphans.push(s);
    }
  }

  let universeOrder = [...groups.keys()];
  const currentUniverse = (current as any).universe_id as string | null | undefined;
  if (current.story_type === "pre_recorded" && currentUniverse && groups.has(currentUniverse)) {
    universeOrder = [currentUniverse, ...universeOrder.filter((u) => u !== currentUniverse)];
  }

  const sequence: Story[] = [
    ...universeOrder.flatMap((u) => groups.get(u) ?? []),
    ...orphans,
  ].filter((s) => s.id !== current.id);

  const unplayed = sequence.filter((s) => !played.has(s.id));
  if (unplayed.length > 0) {
    out.push(...unplayed);
  } else if (sequence.length > 0) {
    // Every universe for this age has been played through this session:
    // loop back to the first universe and start again.
    for (const s of sequence) played.delete(s.id);
    out.push(...sequence);
  }

  return out;
};

/** Returns the next playable story, skipping ones without usable audio. */
export const pickNextStory = async (opts: {
  profileId: string | null;
  childAge: number | null;
  current: Story;
}): Promise<Story | null> => {
  const candidates = await buildCandidates(opts);
  for (const c of candidates.slice(0, 8)) {
    if (await storyHasAudio(c.id)) return c;
    markStoryPlayed(c.id); // broken/empty: don't offer it again this session
  }
  return null;
};
