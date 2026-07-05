import type { Story } from "./stories";

export type StoryStatus = "ready" | "preparing" | "stale" | "lang_age_failed";

type StatusInput = Pick<Story, "is_generated" | "scoring_status" | "generation_attempts">;

export const MAX_ATTEMPTS = 5;

export const getStoryStatus = (s: StatusInput): StoryStatus => {
  if (s.is_generated) return "ready";
  if (s.scoring_status === "STALE") return "stale";
  if (s.scoring_status === "failed_language_age") return "lang_age_failed";
  const attempts = s.generation_attempts ?? 0;
  if ((s.scoring_status === null || s.scoring_status === "failed_retrying") && attempts < MAX_ATTEMPTS) {
    return "preparing";
  }
  if (s.scoring_status && s.scoring_status !== "failed_retrying" && attempts < MAX_ATTEMPTS) {
    return "preparing";
  }
  return "stale";
};

