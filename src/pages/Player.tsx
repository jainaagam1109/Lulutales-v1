import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Play, Pause, Heart, SkipBack, SkipForward, RotateCcw, RotateCw, ListMusic, Flag } from "lucide-react";
import { toast } from "sonner";
import { fetchStory, fetchEpisodes, isSaved, toggleSaved, type Story } from "@/lib/stories";
import { SkillPicture, skillKeyFor } from "@/components/SkillPicture";
import { ReportSheet } from "@/components/ReportSheet";
import { SKILL_ART } from "@/lib/skillArt";
import {
  AUTOPLAY_MAX_ADVANCES,
  isAutoplayEnabled,
  isAutoplayStory,
  markStoryPlayed,
  pickNextStory,
} from "@/lib/autoplayQueue";

import { PhoneShell } from "@/components/PhoneShell";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/track";
import { cleanEpisodeTitle } from "@/lib/episodeTitle";
import {
  getActiveProfileId,
  setLastStory,
  setLastEpisode,
  setPosition,
  getPosition,
  setEpisodeDone,
  isEpisodeDone,
  setStoryPct,
  markStoryCompleted,
  getLastEpisode,
} from "@/lib/lastStory";

import { resolveInitialRate, setProfilePlaybackRate } from "@/lib/playbackRate";
import { localSleepMinutes } from "@/lib/parentSettings";

const fetchUniverse = async (universeId: string | null | undefined): Promise<string | null> => {
  if (!universeId) return null;
  const { data, error } = await (supabase as any)
    .from("universes")
    .select("display_name")
    .eq("id", universeId)
    .maybeSingle();
  if (error) return null;
  return data?.display_name ?? null;
};

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${sec}`;
};

function countdownForDuration(secs: number) {
  if (secs < 180) return 3;
  if (secs <= 300) return 5;
  return 7;
}

const Player = () => {
  const params = useParams();
  const id = params.id ?? "";
  const epParamRaw = params.episodeNumber;
  const epNum = parseInt(epParamRaw ?? "1", 10) || 1;
  const nav = useNavigate();
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldAutoplayRef = useRef(false);
  const resumeAppliedRef = useRef<string | null>(null);
  const lastServerWriteAtRef = useRef<number>(0);
  const serverResumeAppliedRef = useRef<string | null>(null);
  const { data: story } = useQuery({ queryKey: ["story", id], queryFn: () => fetchStory(id) });
  const { data: episodes, isLoading: epLoading } = useQuery({
    queryKey: ["episodes", id],
    queryFn: () => fetchEpisodes(id),
    enabled: !!id,
  });
  const universeId = (story as any)?.universe_id;
  const { data: universeName } = useQuery({
    queryKey: ["universe-name", universeId],
    queryFn: () => fetchUniverse(universeId),
    enabled: !!universeId,
  });

  const current = episodes?.find((e) => e.episode_number === epNum);
  const episodeText = (((current as any)?.episode_text as string | null | undefined) ?? "").trim() || null;
  const audioUrl = current?.audio_url ?? null;
  const totalEps = episodes?.length ?? 0;
  const maxEp = episodes && episodes.length > 0 ? Math.max(...episodes.map((e) => e.episode_number)) : 1;
  const hasPrev = epNum > 1;
  const hasNext = !!episodes && epNum < maxEp;

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoNext, setAutoNext] = useState<Story | null>(null);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [autoPrompt, setAutoPrompt] = useState(false);
  const advancesRef = useRef(0);
  const autoStoppedRef = useRef(false);
  const [autoStopped, setAutoStopped] = useState(false);
  const [runActive, setRunActive] = useState(false);

  // ---- cross-story autoplay ------------------------------------------------
  const queueNextStory = useCallback(async () => {
    if (autoStoppedRef.current) return;
    if (!isAutoplayEnabled()) return;
    if (!story || !isAutoplayStory(story.story_type)) return;
    if (advancesRef.current >= AUTOPLAY_MAX_ADVANCES) {
      setAutoCountdown(null);
      setAutoNext(null);
      setAutoPrompt(true);
      return;
    }
    const pid = getActiveProfileId();
    const ageRaw = typeof window !== "undefined" ? localStorage.getItem("lulutales_child_age") : null;
    const parsedAge = ageRaw ? parseInt(ageRaw, 10) : NaN;
    const next = await pickNextStory({
      profileId: pid,
      childAge: isFinite(parsedAge) ? parsedAge : null,
      current: story,
    });
    if (!next || autoStoppedRef.current) return;
    setAutoPrompt(false);
    setAutoNext(next);
    setAutoCountdown(5);
  }, [story]);

  const queueRef = useRef(queueNextStory);
  useEffect(() => {
    queueRef.current = queueNextStory;
  }, [queueNextStory]);

  const stopAutoplay = () => {
    autoStoppedRef.current = true;
    setAutoStopped(true);
    setRunActive(false);
    setAutoCountdown(null);
    setAutoNext(null);
    setAutoPrompt(false);
  };

  // Remember what has already played in this run.
  useEffect(() => {
    if (story?.id && isAutoplayStory(story.story_type)) markStoryPlayed(story.id);
  }, [story?.id, story?.story_type]);

  // Arrived on a story with no usable audio mid-run: skip to the next candidate.
  useEffect(() => {
    if (advancesRef.current === 0 || autoStoppedRef.current) return;
    if (!episodes || episodes.length === 0) return;
    if (episodes.some((e) => !!e.audio_url)) return;
    void queueRef.current();
  }, [episodes, story?.id]);

  // Countdown into the next story.
  useEffect(() => {
    if (autoCountdown === null) return;
    if (autoCountdown === 0) {
      const n = autoNext;
      setAutoCountdown(null);
      setAutoNext(null);
      if (n) {
        advancesRef.current += 1;
        setRunActive(true);
        shouldAutoplayRef.current = true;
        markStoryPlayed(n.id);
        nav(`/player/${n.id}/1`, { replace: true });
      }
      return;
    }
    const t = setTimeout(() => setAutoCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [autoCountdown, autoNext, nav]);



  const [view, setView] = useState<"picture" | "read">("picture");
  const [sheet, setSheet] = useState<null | "speed" | "episodes" | "report">(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (id) isSaved(id).then(setSaved).catch(() => {});
  }, [id]);
  const onToggleSave = async () => {
    const next = await toggleSaved(id);
    setSaved(next);
    toast.success(next ? "Saved to My stories" : "Removed from My stories");
  };
  const [speed, setSpeed] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const pid = localStorage.getItem("lulutales_profile_id");
    const ageRaw = localStorage.getItem("lulutales_child_age");
    const age = ageRaw ? parseInt(ageRaw, 10) : null;
    return resolveInitialRate(pid, isFinite(age as number) ? age : null);
  });


  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = speed;
    a.defaultPlaybackRate = speed;
    (a as any).preservesPitch = true;
    try {
      const pid = localStorage.getItem("lulutales_profile_id");
      setProfilePlaybackRate(pid, speed);
    } catch {}
  }, [speed, audioUrl]);

  // If user opens /player/:id with no episode in the URL, redirect to the
  // last-played episode for this (active profile, story).
  useEffect(() => {
    if (epParamRaw !== undefined) return;
    if (!episodes || episodes.length === 0) return;
    const pid = getActiveProfileId();
    const ep = pid ? Math.min(getLastEpisode(pid, id), maxEp) : 1;
    if (ep !== epNum) nav(`/player/${id}/${ep}`, { replace: true });
  }, [epParamRaw, episodes, id, nav, maxEp, epNum]);

  // Never render audio for stories that aren't ready — send users to the right place.
  useEffect(() => {
    if (!story) return;
    if (story.is_generated) return;
    nav(`/generating/${story.id}`, { replace: true });
  }, [story, nav]);

  // When episode (audioUrl) changes: reset UI state but DO NOT force currentTime=0.
  // We'll restore the saved position once loadedmetadata fires (below).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    setT(0);
    setDur(0);
    setPlaying(false);
    resumeAppliedRef.current = null;
    if (!audioUrl) return;
    // Mark this story as the active "last story" for this profile as soon as
    // we land on the player (so the floating MiniPlayer surfaces it).
    if (story?.id) {
      const pid = getActiveProfileId();
      if (pid) {
        setLastStory(pid, story.id);
        setLastEpisode(pid, story.id, epNum);
      }
    }
    const timer = setTimeout(() => {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [audioUrl, story?.id, epNum]);

  // Apply saved resume position once metadata is loaded, then track progress
  // (every ~5s local + 10s server throttle, plus forced flushes on pause/seek/unmount/visibility).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const pid = getActiveProfileId();
    const storyId = story?.id ?? null;
    const storyType = story?.story_type ?? null;
    // Audio-only: bedtime_text never writes to playback_progress.
    const audioStory = storyType === "personalised_audio" || storyType === "pre_recorded";

    let lastLocalWriteSecs = -10;

    const flushServer = (force: boolean, opts?: { completed?: boolean }) => {
      if (!pid || !storyId || !audioStory) return;
      const node = audioRef.current;
      if (!node) return;
      const pos = node.currentTime;
      const d = node.duration;
      if (!isFinite(pos)) return;
      const now = Date.now();
      if (!force && now - lastServerWriteAtRef.current < 10_000) return;
      lastServerWriteAtRef.current = now;
      const pct =
        totalEps > 0
          ? Math.max(
              0,
              Math.min(
                100,
                Math.floor((((epNum - 1) + (isFinite(d) && d > 0 ? Math.min(1, pos / d) : 0)) / totalEps) * 100),
              ),
            )
          : 0;
      void supabase
        .from("playback_progress" as any)
        .upsert(
          {
            profile_id: pid,
            story_id: storyId,
            episode_id: current?.id ?? null,
            episode_number: epNum,
            position_seconds: pos,
            duration_seconds: isFinite(d) ? d : null,
            percent: pct,
            completed: !!opts?.completed,
          } as any,
          { onConflict: "profile_id,story_id" } as any,
        )
        .then(() => {});
    };

    const persist = (force = false) => {
      if (!pid || !storyId) return;
      const pos = a.currentTime;
      const d = a.duration;
      if (!isFinite(pos)) return;
      if (!force && Math.abs(pos - lastLocalWriteSecs) < 5) {
        // local throttle; still let server throttle decide independently
        flushServer(false);
        return;
      }
      lastLocalWriteSecs = pos;
      setPosition(pid, storyId, epNum, pos, isFinite(d) ? d : 0);

      // Whole-story percent: only compute once episode count is known.
      if (totalEps > 0) {
        const completedCount = epNum - 1;
        const frac = isFinite(d) && d > 0 ? Math.min(1, Math.max(0, pos / d)) : 0;
        const pct = ((completedCount + frac) / totalEps) * 100;
        setStoryPct(pid, storyId, pct);
      }

      // story_analytics progress row (best-effort, fire and forget).
      if (current?.id) {
        void supabase
          .from("story_analytics")
          .insert({
            profile_id: pid,
            story_id: storyId,
            episode_id: current.id,
            event_type: "progress",
            source: "audio",
            position_seconds: Math.floor(pos),
            duration_seconds: isFinite(d) ? Math.floor(d) : 0,
          } as any)
          .then(() => {});
      }

      flushServer(force);
    };

    const onTime = () => {
      setT(a.currentTime);
      persist(false);
    };
    const onPause = () => persist(true);
    const onSeeked = () => flushServer(true);
    const onMeta = () => {
      setDur(a.duration);
      if (pid && storyId && resumeAppliedRef.current !== audioUrl) {
        // 1) Try local first for instant resume.
        const saved = getPosition(pid, storyId, epNum);
        const dur = a.duration;
        const farEnoughFromEnd = saved < (isFinite(dur) ? dur : Infinity) - 5;
        if (saved >= 5 && farEnoughFromEnd) {
          try {
            a.currentTime = saved;
          } catch {}
          setT(saved);
        }
        resumeAppliedRef.current = audioUrl;

        // 2) Also consult the server row (audio-only) in case it's further ahead
        //    and the matching episode is the one we just loaded. Only on first
        //    metadata load per audioUrl.
        if (audioStory && serverResumeAppliedRef.current !== audioUrl) {
          serverResumeAppliedRef.current = audioUrl;
          void supabase
            .from("playback_progress" as any)
            .select("episode_number, position_seconds, duration_seconds, completed")
            .eq("profile_id", pid)
            .eq("story_id", storyId)
            .maybeSingle()
            .then(({ data }: any) => {
              if (!data) return;
              if (data.completed) return;
              if ((data.episode_number ?? -1) !== epNum) return;
              const node = audioRef.current;
              if (!node) return;
              const serverPos = Number(data.position_seconds) || 0;
              const d2 = node.duration;
              if (serverPos < 5) return;
              if (isFinite(d2) && serverPos > d2 - 5) return;
              // No-rewind: never seek backwards from the user's current spot.
              if (serverPos <= node.currentTime + 1) return;
              try {
                node.currentTime = serverPos;
              } catch {}
              setT(serverPos);
            });
        }
      }
      if (shouldAutoplayRef.current) {
        shouldAutoplayRef.current = false;
        a.play()
          .then(() => setPlaying(true))
          .catch(() => {});
      }
    };
    const onEnd = () => {
      if (pid && storyId) {
        setEpisodeDone(pid, storyId, epNum);
        const total = totalEps || 1;
        setStoryPct(pid, storyId, (epNum / total) * 100);
      }
      if (hasNext) {
        setCountdown(countdownForDuration(dur));
        flushServer(true);
      } else {
        if (pid && storyId) markStoryCompleted(pid, storyId);
        if (pid && storyId) {
          import("@/lib/progress").then((m) => m.recordCompletion(pid, storyId, story?.theme ?? null));
        }
        flushServer(true, { completed: true });
        setPlaying(false);
        void queueRef.current();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        persist(true);
      }
    };
    const onPageHide = () => persist(true);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("pause", onPause);
    a.addEventListener("seeked", onSeeked);
    a.addEventListener("ended", onEnd);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      persist(true);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("seeked", onSeeked);
      a.removeEventListener("ended", onEnd);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [audioUrl, hasNext, epNum, id, nav, story, dur, totalEps, current?.id]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      shouldAutoplayRef.current = true;
      nav(`/player/${id}/${epNum + 1}`, { replace: true });
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown, epNum, id, nav]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let heardFlag = false;
    let completedFlag = false;
    let startedFlag = false;
    let maxPosition = 0;
    let logging = false;

    const tryLog = async (eventType: "play" | "complete" | "start") => {
      if (logging) return;
      logging = true;

      if (!story?.id || !current?.id) {
        logging = false;
        return;
      }

      const sessionKey = `lulutales_session_${current.id}_${eventType}`;
      const last = localStorage.getItem(sessionKey);
      if (last && Date.now() - parseInt(last) < 30 * 60 * 1000) {
        logging = false;
        return;
      }
      localStorage.setItem(sessionKey, String(Date.now()));

      let profileId = localStorage.getItem("lulutales_profile_id");
      if (!profileId) {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) {
          logging = false;
          return;
        }
        const { data: kids } = await supabase
          .from("child_profiles")
          .select("id")
          .eq("user_id", uid)
          .order("created_at", { ascending: true })
          .limit(1);
        profileId = kids?.[0]?.id ?? null;
        if (!profileId) {
          logging = false;
          return;
        }
        localStorage.setItem("lulutales_profile_id", profileId);
      }

      const durationSeconds =
        eventType === "complete" ? Math.floor(a.duration || maxPosition) : Math.floor(maxPosition);

      void supabase
        .from("story_analytics")
        .insert({
          profile_id: profileId,
          story_id: story.id,
          episode_id: current.id,
          event_type: eventType,
          source: "audio",
          session_id: getSessionId(),
          position_seconds: Math.floor(a.currentTime),
          duration_seconds: durationSeconds,
        } as any)
        .then(() => {});
    };

    const onPlay = () => {
      if (!startedFlag) { startedFlag = true; void tryLog("start"); }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        heardFlag = true;
      }, 30 * 1000);
    };
    const onPause = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const onTime = () => {
      if (a.currentTime > maxPosition) maxPosition = a.currentTime;
    };
    const onEnded = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      completedFlag = true;
      void tryLog("complete");
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);

    return () => {
      if (timer) clearTimeout(timer);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);

      if (heardFlag && !completedFlag) {
        void tryLog("play");
      }
    };
  }, [story?.id, current?.id]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
      if (story?.id) {
        const pid = getActiveProfileId();
        if (pid) {
          setLastStory(pid, story.id);
          setLastEpisode(pid, story.id, epNum);
        }
      }
    }
  };

  // ---- sleep timer (set in Parents) ----------------------------------------
  // Starts when listening starts; fades the voice out over the last 10 seconds, then stops.
  const sleepEndRef = useRef<number | null>(null);
  const [sleepLeft, setSleepLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    const mins = localSleepMinutes();
    if (!mins) {
      sleepEndRef.current = null;
      setSleepLeft(null);
      return;
    }
    if (!sleepEndRef.current) sleepEndRef.current = Date.now() + mins * 60_000;
    const iv = setInterval(() => {
      const a = audioRef.current;
      const end = sleepEndRef.current;
      if (!a || !end) return;
      const left = end - Date.now();
      setSleepLeft(Math.max(0, Math.ceil(left / 60_000)));
      if (left <= 0) {
        a.pause();
        a.volume = 1;
        setPlaying(false);
        setCountdown(null);
        stopAutoplay();
        sleepEndRef.current = null;
        setSleepLeft(0);
      } else if (left < 10_000) {
        a.volume = Math.max(0, left / 10_000);
      }
    }, 500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const skip = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
  };

  const goPrev = () => hasPrev && nav(`/player/${id}/${epNum - 1}`, { replace: true, state: location.state });
  const goNext = () => hasNext && nav(`/player/${id}/${epNum + 1}`, { replace: true, state: location.state });

  const pct = dur > 0 ? (t / dur) * 100 : 0;
  const skill = skillKeyFor(story as any);
  const skillName = SKILL_ART[skill]?.name ?? "";
  const from = (location.state as { from?: string } | null)?.from ?? "";
  const playingFrom =
    from === "/library" ? "Library" : from === "/my-stories" ? "My stories" : from.startsWith("/universe") ? universeName || "Story world" : from === "/" ? "Home" : story?.story_type === "pre_recorded" ? "Library" : "My stories";
  const epTitle = (n: number, title?: string | null) => cleanEpisodeTitle(title, story?.title, n) || `Episode ${n}`;
  const nextEp = hasNext ? episodes?.find((e) => e.episode_number === epNum + 1) : null;
  const subLine = [skillName, totalEps > 1 ? `Episode ${epNum} of ${totalEps}` : null].filter(Boolean).join(" · ");
  const paragraphs = (episodeText ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const sheetBtn = "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold text-white/80 hover:bg-white/5";

  // Episode not found state
  if (episodes && !epLoading && !current) {
    return (
      <div className="dark">
        <PhoneShell>
          <main className="flex flex-1 flex-col items-center justify-center px-6 text-center text-foreground">
            <h2 className="font-[Quicksand] text-xl font-bold">We couldn’t find this episode</h2>
            <p className="mt-1 text-sm text-muted-foreground">This story doesn’t have an episode {epNum}.</p>
            <button type="button" onClick={() => nav(`/story/${id}`)} className="mt-5 bg-primary px-6 text-primary-foreground">
              Back to the story
            </button>
          </main>
        </PhoneShell>
      </div>
    );
  }

  return (
    <div className="dark">
      <PhoneShell>
        <header className="flex items-center justify-between px-3 pt-3 text-foreground">
          <button
            type="button"
            onClick={() => nav(id ? `/story/${id}` : "/", { state: location.state })}
            aria-label="Close player"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/5"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Playing from</div>
            <div className="text-sm font-semibold">{playingFrom}</div>
          </div>
          <button
            type="button"
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={saved ? "Saved. Tap to remove" : "Save to My stories"}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/5"
          >
            <Heart className={`h-5 w-5 ${saved ? "fill-current text-primary" : ""}`} />
          </button>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto px-6 pb-6 text-foreground">
          {/* Picture / Read along */}
          <div role="tablist" aria-label="View" className="mx-auto mt-2 flex rounded-full bg-white/10 p-1">
            {(["picture", "read"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                disabled={v === "read" && !episodeText}
                onClick={() => setView(v)}
                className={`min-h-9 rounded-full px-4 text-sm font-semibold disabled:opacity-40 ${view === v ? "bg-white text-[#1a1830]" : "text-white/80"}`}
              >
                {v === "picture" ? "Picture" : "Read along"}
              </button>
            ))}
          </div>

          <div className="mx-auto mt-4 w-full max-w-[360px]">
            {view === "read" && episodeText ? (
              <div className="h-[300px] overflow-y-auto rounded-[24px] bg-white/[0.06] p-5 text-[17px] leading-[1.75] text-white/90">
                {paragraphs.map((p, i) => (
                  <p key={i} className="mb-4 !text-white/90 last:mb-0">{p}</p>
                ))}
              </div>
            ) : (
              <div className="aspect-square w-full overflow-hidden rounded-[28px]">
                <SkillPicture skill={skill} />
              </div>
            )}
          </div>

          <div className="mx-auto mt-5 w-full max-w-[360px]">
            {typeof universeName === "string" && <div className="text-xs font-semibold text-primary">{universeName}</div>}
            <h1 className="font-[Quicksand] text-[22px] font-bold leading-tight">{story?.title ?? "Loading…"}</h1>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {subLine}
              {totalEps > 1 && current ? ` · ${epTitle(current.episode_number, current.title)}` : ""}
            </div>

            <div className="mt-4">
              <input
                type="range"
                min={0}
                max={dur || 0}
                step={0.1}
                value={t}
                onChange={(e) => {
                  const a = audioRef.current;
                  if (!a || !isFinite(a.duration)) return;
                  const next = Number(e.target.value);
                  a.currentTime = next;
                  setT(next);
                }}
                disabled={!audioUrl || !dur}
                className="seek-range"
                style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, rgba(255,255,255,.18) ${pct}%)` }}
                aria-label="Seek"
              />
              <div className="mt-1.5 flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>{fmt(t)}</span>
                <span>{fmt(dur)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={goPrev} disabled={!hasPrev} aria-label="Previous episode" className="flex h-12 w-12 items-center justify-center rounded-full disabled:opacity-30">
                <SkipBack className="h-6 w-6 fill-current" />
              </button>
              <button type="button" onClick={() => skip(-10)} aria-label="Back 10 seconds" className="flex h-12 w-12 items-center justify-center rounded-full">
                <RotateCcw className="h-6 w-6" />
                <span className="sr-only">10</span>
              </button>
              <button
                type="button"
                onClick={toggle}
                disabled={!audioUrl}
                aria-label={playing ? "Pause" : "Play"}
                className="lt-card flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                {playing ? <Pause className="h-8 w-8 fill-current" /> : <Play className="ml-1 h-8 w-8 fill-current" />}
              </button>
              <button type="button" onClick={() => skip(10)} aria-label="Forward 10 seconds" className="flex h-12 w-12 items-center justify-center rounded-full">
                <RotateCw className="h-6 w-6" />
                <span className="sr-only">10</span>
              </button>
              <button type="button" onClick={goNext} disabled={!hasNext} aria-label="Next episode" className="flex h-12 w-12 items-center justify-center rounded-full disabled:opacity-30">
                <SkipForward className="h-6 w-6 fill-current" />
              </button>
            </div>

            <div className="mt-4 flex gap-1 border-t border-white/10 pt-3">
              <button type="button" onClick={() => setSheet("speed")} className={sheetBtn}>
                <span className="text-sm font-bold text-white">{speed}×</span>Speed
              </button>
              <button type="button" onClick={() => setSheet("episodes")} disabled={totalEps < 2} className={`${sheetBtn} disabled:opacity-40`}>
                <ListMusic className="h-5 w-5" />Episodes
              </button>
              <button type="button" onClick={() => setSheet("report")} className={sheetBtn}>
                <Flag className="h-5 w-5" />Report
              </button>
            </div>

            {sleepLeft !== null && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {sleepLeft > 0 ? `Sleep timer · stops in ${sleepLeft} min` : "Sleep timer ended. Goodnight!"}
              </p>
            )}

            {!audioUrl && current && <p className="mt-4 text-center text-sm text-muted-foreground">The audio for this episode isn’t ready yet.</p>}

            {countdown !== null && (
              <div className="mt-4 rounded-2xl bg-white/[0.08] p-4">
                <div className="text-sm font-semibold">Next episode in {countdown}s</div>
                {nextEp && <div className="truncate text-sm text-muted-foreground">{epTitle(nextEp.episode_number, nextEp.title)}</div>}
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setCountdown(0)} className="h-10 flex-1 bg-primary text-sm text-primary-foreground">Play now</button>
                  <button type="button" onClick={() => setCountdown(null)} className="min-h-10 flex-1 rounded-full border border-white/20 text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}

            {countdown === null && nextEp && (
              <button type="button" onClick={goNext} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] p-3 text-left">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl"><SkillPicture skill={skill} /></div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Up next</div>
                  <div className="truncate text-sm font-semibold">Episode {nextEp.episode_number} · {epTitle(nextEp.episode_number, nextEp.title)}</div>
                </div>
              </button>
            )}

            {autoNext && autoCountdown !== null && (
              <div className="mt-4 rounded-2xl bg-white/[0.08] p-4">
                <div className="text-sm font-semibold">Next story in {autoCountdown}s</div>
                <div className="truncate text-sm text-muted-foreground">{autoNext.title}</div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setAutoCountdown(0)} className="h-10 flex-1 bg-primary text-sm text-primary-foreground">Play now</button>
                  <button type="button" onClick={stopAutoplay} className="min-h-10 flex-1 rounded-full border border-white/20 text-sm font-semibold">Stop</button>
                </div>
              </div>
            )}

            {autoPrompt && (
              <div className="mt-4 rounded-2xl bg-white/[0.08] p-4">
                <div className="text-sm font-semibold">Still listening?</div>
                <div className="text-sm text-muted-foreground">We’ve played a few stories in a row. Keep going?</div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      advancesRef.current = 0;
                      setAutoPrompt(false);
                      void queueRef.current();
                    }}
                    className="h-10 flex-1 bg-primary text-sm text-primary-foreground"
                  >
                    Keep going
                  </button>
                  <button type="button" onClick={stopAutoplay} className="min-h-10 flex-1 rounded-full border border-white/20 text-sm font-semibold">Stop</button>
                </div>
              </div>
            )}

            {runActive && !autoStopped && autoCountdown === null && !autoPrompt && (
              <button type="button" onClick={stopAutoplay} className="mt-3 min-h-10 w-full text-sm font-semibold text-primary">
                Stop playing more stories
              </button>
            )}
          </div>

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              className="hidden"
              onError={() => {
                // Broken audio during an autoplay run: skip to the next candidate.
                if (advancesRef.current > 0 && !autoStoppedRef.current) void queueRef.current();
              }}
            />
          )}
        </main>
      </PhoneShell>

      {/* ---------- sheets ---------- */}
      {sheet === "report" && story && (
        <ReportSheet storyId={story.id} storyTitle={story.title ?? ""} episodeNumber={totalEps > 1 ? epNum : null} onClose={() => setSheet(null)} />
      )}
      {(sheet === "speed" || sheet === "episodes") && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" role="dialog" aria-modal="true" onClick={() => setSheet(null)}>
          <div className="max-h-[70vh] w-full max-w-[460px] overflow-y-auto rounded-t-[28px] bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-foreground md:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[Quicksand] text-[22px] font-bold">{sheet === "speed" ? "Speed" : "Episodes"}</h2>
            {sheet === "speed" ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[0.75, 0.85, 0.95, 1, 1.1, 1.25].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSpeed(r);
                      setSheet(null);
                    }}
                    className={`min-h-12 rounded-2xl border-2 text-[15px] font-semibold ${speed === r ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    {r === 1 ? "Normal" : `${r}×`}
                  </button>
                ))}
              </div>
            ) : (
              <ol className="mt-3 divide-y divide-border">
                {(episodes ?? []).map((ep) => {
                  const on = ep.episode_number === epNum;
                  return (
                    <li key={ep.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSheet(null);
                          if (!on) nav(`/player/${id}/${ep.episode_number}`, { replace: true, state: location.state });
                        }}
                        className="flex min-h-14 w-full items-center gap-3 text-left"
                      >
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${on ? "bg-primary text-primary-foreground" : "border border-border"}`}>
                          {ep.episode_number}
                        </span>
                        <span className={`flex-1 truncate ${on ? "font-semibold" : ""}`}>{epTitle(ep.episode_number, ep.title)}</span>
                        {on && <span className="text-xs font-semibold text-primary">Playing</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;
