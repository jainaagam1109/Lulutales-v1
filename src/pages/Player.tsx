import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Play, Pause } from "lucide-react";
import { fetchStory, fetchEpisodes } from "@/lib/stories";
import { PhoneShell } from "@/components/PhoneShell";

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
  const { id = "", episodeNumber = "1" } = useParams();
  const epNum = parseInt(episodeNumber, 10) || 1;
  const nav = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldAutoplayRef = useRef(false);
  const { data: story } = useQuery({ queryKey: ["story", id], queryFn: () => fetchStory(id) });
  const { data: episodes, isLoading: epLoading } = useQuery({
    queryKey: ["episodes", id],
    queryFn: () => fetchEpisodes(id),
    enabled: !!id,
  });

  const current = episodes?.find((e) => e.episode_number === epNum);
  const audioUrl = current?.audio_url ?? null;
  const maxEp = episodes && episodes.length > 0 ? Math.max(...episodes.map((e) => e.episode_number)) : 1;
  const hasPrev = epNum > 1;
  const hasNext = !!episodes && epNum < maxEp;

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);


  // Reset playback when episode (audioUrl) changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setT(0);
    setDur(0);
    setPlaying(false);
  }, [audioUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setT(a.currentTime);
      if (a.duration > 0 && id) {
        const pct = Math.floor((a.currentTime / a.duration) * 100);
        localStorage.setItem("lulutales_last_story_progress", String(pct));
      }
    };
    const onMeta = () => {
      setDur(a.duration);
      if (shouldAutoplayRef.current) {
        shouldAutoplayRef.current = false;
        a.play().then(() => setPlaying(true)).catch(() => {});
      }
    };
    const onEnd = () => {
      if (hasNext) {
        setCountdown(countdownForDuration(dur));
      } else {

        localStorage.setItem("lulutales_last_story_completed", "1");
        const pid = localStorage.getItem("lulutales_profile_id");
        if (pid && story?.id) {
          import("@/lib/progress").then((m) =>
            m.recordCompletion(pid, story.id, story.theme ?? null),
          );
        }
        setPlaying(false);
      }
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [audioUrl, hasNext, epNum, id, nav, story]);

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
        localStorage.setItem("lulutales_last_story", story.id);
        localStorage.removeItem("lulutales_last_story_completed");
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
        <div className="flex-1 px-6 pt-6 pb-10">
          <button onClick={() => nav(id ? `/story/${id}` : "/")} className="mb-6 flex items-center gap-1 text-xs text-primary-deep">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
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
      <div className="flex-1 px-6 pt-6 pb-10">
        <button onClick={() => nav(id ? `/story/${id}` : "/")} className="mb-6 flex items-center gap-1 text-xs text-primary-deep">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="mx-auto mb-6 flex h-64 w-64 items-center justify-center rounded-3xl bg-gradient-card text-8xl shadow-soft">
          {story?.thumbnail ?? "📖"}
        </div>

        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-deep">
            {story?.theme}
          </div>
          <h1 className="mt-1 text-xl font-extrabold text-foreground">{story?.title ?? "Loading…"}</h1>
          <div className="text-xs text-muted-foreground">
            {current ? `Episode ${current.episode_number} · ${current.title}` : "Loading episode…"}
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
      </div>
    </PhoneShell>
  );
};

export default Player;
