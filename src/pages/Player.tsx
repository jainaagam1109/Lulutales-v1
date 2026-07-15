import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause } from "lucide-react";
import { fetchStory, fetchEpisodes } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { PageHeader } from "@/components/PageHeader";
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

import { SPEED_STEPS, resolveInitialRate, setProfilePlaybackRate } from "@/lib/playbackRate";

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
  const audioUrl = current?.audio_url ?? null;
  const totalEps = episodes?.length ?? 0;
  const maxEp = episodes && episodes.length > 0 ? Math.max(...episodes.map((e) => e.episode_number)) : 1;
  const hasPrev = epNum > 1;
  const hasNext = !!episodes && epNum < maxEp;

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const pid = localStorage.getItem("lulutales_profile_id");
    const ageRaw = localStorage.getItem("lulutales_child_age");
    const age = ageRaw ? parseInt(ageRaw, 10) : null;
    return resolveInitialRate(pid, isFinite(age as number) ? age : null);
  });

  const speedIdx = SPEED_STEPS.indexOf(speed);
  const canSlower = speedIdx > 0;
  const canFaster = speedIdx >= 0 && speedIdx < SPEED_STEPS.length - 1;

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

      const sessionKey = `lulutales_session_${current.id}`;
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
          position_seconds: Math.floor(a.currentTime),
          duration_seconds: durationSeconds,
        } as any)
        .then(() => {});
    };

    const onPlay = () => {
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

  const skip = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
  };

  const goPrev = () => hasPrev && nav(`/player/${id}/${epNum - 1}`, { replace: true });
  const goNext = () => hasNext && nav(`/player/${id}/${epNum + 1}`, { replace: true });

  const pct = dur > 0 ? (t / dur) * 100 : 0;

  // Episode not found state
  if (episodes && !epLoading && !current) {
    return (
      <PhoneShell>
        <PageHeader backTo={id ? `/story/${id}` : "/"} />
        <main className="flex-1 overflow-y-auto px-6 pb-24">

          <div className="mt-20 text-center">
            <div className="text-5xl">🤔</div>
            <h2 className="mt-3 text-lg font-extrabold text-foreground">Episode not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">This story doesn't have an episode {epNum}.</p>
          </div>
        </main>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <PageHeader backTo={id ? `/story/${id}` : "/"} />
      <main className="flex-1 overflow-y-auto px-6 pb-24">

        <div className="mx-auto mb-6 flex h-64 w-64 items-center justify-center rounded-3xl bg-gradient-card text-8xl shadow-soft">
          {story?.thumbnail ?? "📖"}
        </div>

        <div className="text-center">
          {typeof universeName === "string" && (
            <div className="mb-1 text-[10px] font-semibold text-muted-foreground">
              {universeName}
            </div>
          )}
          <div className="text-[10px] font-semibold text-primary-deep">{story?.theme}</div>
          <h1 className="mt-1 text-xl font-extrabold text-foreground">{story?.title ?? "Loading…"}</h1>
          <div className="text-xs text-muted-foreground">
            {current
              ? cleanEpisodeTitle(current.title, story?.title, current.episode_number) ||
                `Episode ${current.episode_number}`
              : "Loading episode…"}
          </div>
        </div>

        <div className="mt-8">
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
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--secondary)) ${pct}%)`,
            }}
            aria-label="Seek"
          />
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{fmt(t)}</span>
            <span>{fmt(dur)}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => skip(-10)}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-primary-deep"
          >
            - 10s
          </button>
          <button
            onClick={toggle}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50"
            aria-label={playing ? "Pause" : "Play"}
            disabled={!audioUrl}
          >
            {playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current" />}
          </button>
          <button
            onClick={() => skip(10)}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-primary-deep"
          >
            + 10s
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={() => canSlower && setSpeed(SPEED_STEPS[speedIdx - 1])}
            disabled={!canSlower}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-primary-deep disabled:opacity-40"
            aria-label="Slower"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs font-bold text-foreground">{speed}x</span>
          <button
            onClick={() => canFaster && setSpeed(SPEED_STEPS[speedIdx + 1])}
            disabled={!canFaster}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-primary-deep disabled:opacity-40"
            aria-label="Faster"
          >
            +
          </button>
        </div>

        {!audioUrl && current && (
          <p className="mt-6 text-center text-xs text-muted-foreground">No audio uploaded for this episode yet.</p>
        )}

        {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />}

        {countdown !== null && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-3 text-center shadow-soft">
            <div className="text-xs font-semibold text-foreground">Next episode in {countdown}s</div>
            <div className="mt-2 flex justify-center gap-2">
              <button
                onClick={() => setCountdown(0)}
                className="rounded-full bg-gradient-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground shadow-glow"
              >
                Play now
              </button>
              <button
                onClick={() => setCountdown(null)}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-[11px] font-semibold text-primary-deep"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </PhoneShell>
  );
};

export default Player;
