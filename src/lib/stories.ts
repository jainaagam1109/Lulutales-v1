import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/events";
import type { Tables, Json } from "@/integrations/supabase/types";

export type Story = Tables<"stories">;
export type Episode = Tables<"episodes">;
export type Universe = { id: string; display_name: string };

const getActiveProfileId = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("lulutales_profile_id") : null;

export const fetchEpisodes = async (storyId: string): Promise<Episode[]> => {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("story_id", storyId)
    .order("episode_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const fetchStoriesForProfile = async (profileId: string): Promise<Story[]> => {
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("child_profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const fetchFreshPersonalisedStories = async (profileId: string): Promise<Story[]> => {
  if (!profileId) return [];
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: stories, error } = await supabase
    .from("stories")
    .select("*")
    .eq("child_profile_id", profileId)
    .eq("is_generated", true)
    .in("story_type", ["personalised_audio", "bedtime_text"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  const candidates = stories ?? [];
  if (candidates.length === 0) return [];

  const ids = candidates.map((s) => s.id);
  const { data: completedRows, error: cErr } = await supabase
    .from("story_analytics")
    .select("story_id")
    .eq("profile_id", profileId)
    .eq("event_type", "complete")
    .in("story_id", ids);
  if (cErr) throw cErr;
  const completed = new Set((completedRows ?? []).map((r) => r.story_id));

  return candidates.filter((s) => !completed.has(s.id)).slice(0, 2);
};

export const createPersonalisedStory = async (input: {
  title: string;
  theme: string | null;
  description: string | null;
  story_type: "personalised_audio" | "bedtime_text";
  age_group: string | null;
  child_profile_id: string;
  thumbnail?: string;
  generation_params?: Json | null;
}): Promise<Story> => {
  const { data, error } = await supabase
    .from("stories")
    .insert({ ...input, is_featured: false })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const fetchStories = async (): Promise<Story[]> => {
  // RLS already returns global stories + ones owned by this user's kids.
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const stories = (data ?? []) as Story[];
  // Hide stories owned by soft-deleted child profiles.
  const ownerIds = Array.from(
    new Set(stories.map((s) => s.owner_profile_id).filter((v): v is string => !!v))
  );
  if (ownerIds.length === 0) return stories;
  const { data: deletedRows } = await (supabase as any)
    .from("child_profiles")
    .select("id")
    .in("id", ownerIds)
    .eq("status", "deleted");
  const deletedSet = new Set<string>((deletedRows ?? []).map((r: any) => r.id as string));
  if (deletedSet.size === 0) return stories;
  return stories.filter((s) => !s.owner_profile_id || !deletedSet.has(s.owner_profile_id));
};


export const fetchStory = async (id: string): Promise<Story | null> => {
  const { data, error } = await supabase.from("stories").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
};

export const fetchStoryTags = async (storyId: string): Promise<string[]> => {
  const { data, error } = await supabase.from("story_tags").select("tag").eq("story_id", storyId);
  if (error) throw error;
  return (data ?? []).map((r) => r.tag);
};

export const fetchSavedStories = async (): Promise<Story[]> => {
  const profileId = getActiveProfileId();
  if (!profileId) return [];
  const { data, error } = await supabase
    .from("user_library")
    .select("story_id, stories(*)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => r.stories).filter(Boolean);
};

export const isSaved = async (storyId: string): Promise<boolean> => {
  const profileId = getActiveProfileId();
  if (!profileId) return false;
  const { data } = await supabase
    .from("user_library")
    .select("id")
    .eq("story_id", storyId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return !!data;
};

export const toggleSaved = async (storyId: string): Promise<boolean> => {
  const profileId = getActiveProfileId();
  if (!profileId) return false;
  const saved = await isSaved(storyId);
  if (saved) {
    await supabase
      .from("user_library")
      .delete()
      .eq("story_id", storyId)
      .eq("profile_id", profileId);
    trackEvent("library_removed", { story_id: storyId });
    return false;
  }
  await supabase.from("user_library").insert({ story_id: storyId, profile_id: profileId });
  trackEvent("library_added", { story_id: storyId });
  return true;
};
