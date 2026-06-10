import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause } from "lucide-react";
import { fetchStory, fetchEpisodes } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
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

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
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
  const { data: story } = useQuery({ queryKey: ["story", id], queryFn: () => fetchStory(id) });
  const { data: episodes, isLoading: epLoading } = useQuery({
    queryKey: ["episodes", id],
    queryFn: () => fetchEpisodes(id),
    enabled: !!id,
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
  // (every ~5s, on pause, on unmount). Also write to story_analytics.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const pid = getActiveProfileId();
    const storyId = story?.id ?? null;

    let lastWriteSecs = -10;

    const persist = (force = false) => {
      if (!pid || !storyId) return;
      const pos = a.currentTime;
      const d = a.duration;
      if (!isFinite(pos)) return;
      if (!force && Math.abs(pos - lastWriteSecs) < 5) return;
      lastWriteSecs = pos;
      setPosition(pid, storyId, epNum, pos, isFinite(d) ? d : 0);

      // Whole-story percent: completed episodes + fraction of current.
      const total = totalEps || 1;
      const completedCount = epNum - 1; // earlier episodes treated as complete
      const frac = isFinite(d) && d > 0 ? Math.min(1, Math.max(0, pos / d)) : 0;
      const pct = ((completedCount + frac) / total) * 100;
      setStoryPct(pid, storyId, pct);

      // story_analytics progress row (best-effort, fire and forget).
      if (current?.id) {
        void supabase.from("story_analytics").insert({
          profile_id: pid,
          story_id: storyId,
          episode_id: current.id,
          event_type: "progress",
          source: "audio",
          position_seconds: Math.floor(pos),
          duration_seconds: isFinite(d) ? Math.floor(d) : 0,
        } as any).then(() => {});
      }
    };

    const onTime = () => {
      setT(a.currentTime);
      persist(false);
    };
    const onPause = () => persist(true);
    const onMeta = () => {
      setDur(a.duration);
      if (pid && storyId && resumeAppliedRef.current !== audioUrl) {
        const saved = getPosition(pid, storyId, epNum);
        if (saved > 0 && saved < (a.duration || Infinity) - 2) {
          try { a.currentTime = saved; } catch {}
          setT(saved);
        }
        resumeAppliedRef.current = audioUrl;
      }
      if (shouldAutoplayRef.current) {
        shouldAutoplayRef.current = false;
        a.play().then(() => setPlaying(true)).catch(() => {});
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
      } else {
        if (pid && storyId) markStoryCompleted(pid, storyId);
        if (pid && storyId) {
          import("@/lib/progress").then((m) =>
            m.recordCompletion(pid, storyId, story?.theme ?? null),
          );
        }
        setPlaying(false);
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    return () => {
      persist(true);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
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
    let maxPosition = 0;
    let logging = false;

    const tryLog = async (eventType: "play" | "complete") => {
      if (logging) return;
      logging = true;

      if (!story?.id || !current?.id) { logging = false; return; }

      const sessionKey = `lulutales_session_${current.id}`;
      const last = localStorage.getItem(sessionKey);
      if (last && Date.now() - parseInt(last) < 30 * 60 * 1000) { logging = false; return; }
      localStorage.setItem(sessionKey, String(Date.now()));

      let profileId = localStorage.getItem("lulutales_profile_id");
      if (!profileId) {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) { logging = false; return; }
        const { data: kids } = await supabase
          .from("child_profiles")
          .select("id")
          .eq("user_id", uid)
          .order("created_at", { ascending: true })
          .limit(1);
        profileId = kids?.[0]?.id ?? null;
        if (!profileId) { logging = false; return; }
        localStorage.setItem("lulutales_profile_id", profileId);
      }

      const durationSeconds =
        eventType === "complete"
          ? Math.floor(a.duration || maxPosition)
          : Math.floor(maxPosition);

      void supabase.from("story_analytics").insert({
        profile_id: profileId,
        story_id: story.id,
        episode_id: current.id,
        event_type: eventType,
        source: "audio",
        position_seconds: Math.floor(a.currentTime),
        duration_seconds: durationSeconds,
      } as any).then(() => {});
    };

    const onPlay = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { heardFlag = true; }, 30 * 1000);
    };
    const onPause = () => {
      if (timer) { clearTimeout(timer); timer = null; }
    };
    const onTime = () => {
      if (a.currentTime > maxPosition) maxPosition = a.currentTime;
    };
    const onEnded = () => {
      if (timer) { clearTimeout(timer); timer = null; }
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
    a.currentTime = Math.max(0, Math.min((a.duration || 0), a.currentTime + delta));
  };

  const goPrev = () => hasPrev && nav(`/player/${id}/${epNum - 1}`, { replace: true });
  const goNext = () => hasNext && nav(`/player/${id}/${epNum + 1}`, { replace: true });

  const pct = dur > 0 ? (t / dur) * 100 : 0;

  // Episode not found state
  if (episodes && !epLoading && !current) {
    return (
      <PhoneShell>
        <PageHeader backTo={id ? `/story/${id}` : "/"} />
        <div className="flex-1 px-6 pb-10">
          <div className="mt-20 text-center">
            <div className="text-5xl">🤔</div>
            <h2 className="mt-3 text-lg font-extrabold text-foreground">Episode not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This story doesn't have an episode {epNum}.
            </p>
          </div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <PageHeader backTo={id ? `/story/${id}` : "/"} />
      <div className="flex-1 px-6 pb-10">


        <div className="mx-auto mb-6 flex h-64 w-64 items-center justify-center rounded-3xl bg-gradient-card text-8xl shadow-soft">
          {story?.thumbnail ?? "📖"}
        </div>

        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-deep">
            {story?.theme}
          </div>
          <h1 className="mt-1 text-xl font-extrabold text-foreground">{story?.title ?? "Loading…"}</h1>
          <div className="text-xs text-muted-foreground">
            {current
              ? (() => {
                  const sub = cleanEpisodeTitle(current.title, story?.title, current.episode_number);
                  return `Episode ${current.episode_number}${sub ? ` · ${sub}` : ""}`;
                })()
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

        {!audioUrl && current && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            No audio uploaded for this episode yet.
          </p>
        )}

        {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />}

        {countdown !== null && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-3 text-center shadow-soft">
            <div className="text-xs font-semibold text-foreground">
              Next episode in {countdown}s
            </div>
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
      </div>
    </PhoneShell>
  );
};

export default Player;
