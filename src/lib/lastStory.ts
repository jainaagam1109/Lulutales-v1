// Per-active-profile "continue listening" helpers.
// All keys are scoped by the active child profile id so switching profiles
// never leaks another child's in-progress story.

const PROFILE_KEY = "lulutales_profile_id";

export const getActiveProfileId = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem(PROFILE_KEY);

const k = {
  lastStory: (pid: string) => `lulutales_last_story_${pid}`,
  lastEp: (pid: string, storyId: string) => `lulutales_last_ep_${pid}_${storyId}`,
  pos: (pid: string, storyId: string, ep: number) =>
    `lulutales_pos_${pid}_${storyId}_${ep}`,
  dur: (pid: string, storyId: string, ep: number) =>
    `lulutales_dur_${pid}_${storyId}_${ep}`,
  storyPct: (pid: string, storyId: string) =>
    `lulutales_story_pct_${pid}_${storyId}`,
  completed: (pid: string, storyId: string) =>
    `lulutales_completed_${pid}_${storyId}`,
  epDone: (pid: string, storyId: string, ep: number) =>
    `lulutales_epdone_${pid}_${storyId}_${ep}`,
};

export const setLastStory = (pid: string, storyId: string) => {
  localStorage.setItem(k.lastStory(pid), storyId);
  localStorage.removeItem(k.completed(pid, storyId));
};

export const getLastStoryId = (pid: string): string | null => {
  const id = localStorage.getItem(k.lastStory(pid));
  if (!id) return null;
  if (localStorage.getItem(k.completed(pid, id)) === "1") return null;
  return id;
};

export const markStoryCompleted = (pid: string, storyId: string) => {
  localStorage.setItem(k.completed(pid, storyId), "1");
};

export const setLastEpisode = (pid: string, storyId: string, ep: number) => {
  localStorage.setItem(k.lastEp(pid, storyId), String(ep));
};

export const getLastEpisode = (pid: string, storyId: string): number => {
  const v = localStorage.getItem(k.lastEp(pid, storyId));
  const n = v ? parseInt(v, 10) : 1;
  return isFinite(n) && n > 0 ? n : 1;
};

export const setPosition = (
  pid: string,
  storyId: string,
  ep: number,
  posSecs: number,
  durSecs: number,
) => {
  localStorage.setItem(k.pos(pid, storyId, ep), String(Math.floor(posSecs)));
  if (durSecs > 0)
    localStorage.setItem(k.dur(pid, storyId, ep), String(Math.floor(durSecs)));
};

export const getPosition = (pid: string, storyId: string, ep: number): number => {
  const v = localStorage.getItem(k.pos(pid, storyId, ep));
  const n = v ? parseInt(v, 10) : 0;
  return isFinite(n) && n > 0 ? n : 0;
};

export const setEpisodeDone = (pid: string, storyId: string, ep: number) => {
  localStorage.setItem(k.epDone(pid, storyId, ep), "1");
};

export const isEpisodeDone = (pid: string, storyId: string, ep: number): boolean =>
  localStorage.getItem(k.epDone(pid, storyId, ep)) === "1";

export const setStoryPct = (pid: string, storyId: string, pct: number) => {
  localStorage.setItem(k.storyPct(pid, storyId), String(Math.max(0, Math.min(100, Math.floor(pct)))));
};

export const getStoryPct = (pid: string, storyId: string): number => {
  const v = localStorage.getItem(k.storyPct(pid, storyId));
  const n = v ? parseInt(v, 10) : 0;
  return isFinite(n) ? n : 0;
};
