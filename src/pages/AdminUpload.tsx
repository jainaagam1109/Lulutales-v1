import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveBucket } from "@/lib/themeCatalog";
import { PhoneShell } from "@/components/PhoneShell";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const THUMBNAILS = ["📖", "🦁", "🌙", "🌳", "🐙", "🐰", "⭐", "🌈", "🎵", "🏔️", "🌊", "🦋", "🔥", "🎨", "🚀", "🌸"];

type EpisodeForm = {
  title: string;
  description: string;
  showDescription: boolean;
  file: File | null;
  duration: number | null;
};

const emptyEpisode = (): EpisodeForm => ({
  title: "",
  description: "",
  showDescription: false,
  file: null,
  duration: null,
});

const decodeAudioDuration = async (file: File): Promise<number | null> => {
  try {
    const buf = await file.arrayBuffer();
    const Ctx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    try {
      const decoded = await ctx.decodeAudioData(buf.slice(0));
      return Math.round(decoded.duration);
    } finally {
      ctx.close?.();
    }
  } catch {
    return null;
  }
};

const inputCls =
  "w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary";
const labelCls = "mb-1 block text-[10px] font-semibold text-muted-foreground";

const AdminUpload = () => {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [thumbnail, setThumbnail] = useState("📖");
  const [ageGroup, setAgeGroup] = useState("4-7");
  const [summary, setSummary] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [episodes, setEpisodes] = useState<EpisodeForm[]>([emptyEpisode()]);
  const [busy, setBusy] = useState(false);

  const updateEpisode = (idx: number, patch: Partial<EpisodeForm>) =>
    setEpisodes((eps) => eps.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  const handleFile = async (idx: number, file: File | null) => {
    if (!file) {
      updateEpisode(idx, { file: null, duration: null });
      return;
    }
    const duration = await decodeAudioDuration(file);
    updateEpisode(idx, { file, duration });
  };

  const addEpisode = () => setEpisodes((eps) => [...eps, emptyEpisode()]);

  const lastEpisodeReady = episodes[episodes.length - 1]?.title.trim().length > 0;

  const reset = () => {
    setTitle("");
    setTheme("");
    setThumbnail("📖");
    setAgeGroup("4-7");
    setSummary("");
    setIsFeatured(false);
    setEpisodes([emptyEpisode()]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Story title is required");
      return;
    }
    const validEpisodes = episodes.filter((ep) => ep.title.trim());
    if (validEpisodes.length === 0) {
      toast.error("Add at least one episode with a title");
      return;
    }

    setBusy(true);
    try {
      // 1. Upload audio files first
      const uploaded: { audio_url: string | null; duration: number | null }[] = [];
      for (const ep of validEpisodes) {
        if (ep.file) {
          const ext = ep.file.name.split(".").pop() || "mp3";
          const path = `episodes/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("stories-audio")
            .upload(path, ep.file, { contentType: ep.file.type || "audio/mpeg" });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("stories-audio").getPublicUrl(path);
          uploaded.push({ audio_url: pub.publicUrl, duration: ep.duration });
        } else {
          uploaded.push({ audio_url: null, duration: null });
        }
      }

      // 2. Insert story
      const { data: story, error: insErr } = await supabase
        .from("stories")
        .insert({
          title: title.trim(),
          theme: theme.trim() || null,
          thumbnail,
          age_group: ageGroup.trim() || null,
          description: summary.trim() || null,
          is_featured: isFeatured,
          is_generated: true,
        })
        .select()
        .single();
      if (insErr || !story) throw insErr;

      // 3. Insert episodes
      const rows = validEpisodes.map((ep, i) => ({
        story_id: story.id,
        episode_number: i + 1,
        title: ep.title.trim(),
        description: ep.description.trim() || null,
        audio_url: uploaded[i].audio_url,
        duration: uploaded[i].duration,
      }));
      const { error: epErr } = await supabase.from("episodes").insert(rows);
      if (epErr) throw epErr;

      toast.success("Story uploaded!");
      reset();
    } catch (err: any) {
      console.error("[AdminUpload] upload failed", err);
      toast.error("Upload failed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PhoneShell>
      <PageHeader backTo="/admin" title="Admin · Upload story" subtitle="Internal page" />
      <div className="flex-1 overflow-y-auto px-5 pb-10">


        <form onSubmit={submit} className="space-y-5">
          {/* Section 1: Story details */}
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Title</label>
              <input
                className={inputCls}
                placeholder="Story title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Theme</label>
              <input
                className={inputCls}
                placeholder="e.g. Courage, Friendship"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Thumbnail</label>
              <div className="-mx-5 overflow-x-auto px-5">
                <div className="flex gap-2 pb-1">
                  {THUMBNAILS.map((emoji) => {
                    const selected = emoji === thumbnail;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setThumbnail(emoji)}
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border bg-gradient-card text-2xl transition ${
                          selected ? "border-primary ring-2 ring-primary" : "border-border"
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>For ages</label>
              <input
                className={inputCls}
                placeholder="e.g. 4–7"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Summary</label>
              <textarea
                className={`${inputCls} min-h-[80px]`}
                placeholder="A short description of the story"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              Featured (show in Recommended)
            </label>
          </div>

          {/* Section 2: Episodes */}
          <div className="space-y-3">
            <div className="text-[10px] font-semibold text-muted-foreground">
              Episodes
            </div>

            {episodes.map((ep, idx) => (
              <div key={idx} className="space-y-2 rounded-2xl border border-border bg-card p-3">
                <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                  Episode {idx + 1}
                </span>

                <input
                  className={inputCls}
                  placeholder="Episode title"
                  value={ep.title}
                  onChange={(e) => updateEpisode(idx, { title: e.target.value })}
                />

                {ep.showDescription ? (
                  <div className="space-y-1">
                    <textarea
                      className={`${inputCls} min-h-[70px]`}
                      placeholder="Optional episode description"
                      value={ep.description}
                      onChange={(e) => updateEpisode(idx, { description: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => updateEpisode(idx, { showDescription: false, description: "" })}
                      className="text-[11px] font-semibold text-muted-foreground"
                    >
                      ✕ Remove description
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateEpisode(idx, { showDescription: true })}
                    className="text-[11px] font-semibold text-primary-deep"
                  >
                    ＋ Add description
                  </button>
                )}

                {ep.file ? (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-xs">
                    <span className="truncate text-foreground">{ep.file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleFile(idx, null)}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-background/50 px-3 py-4 text-xs text-muted-foreground hover:border-primary/50">
                    <Upload className="h-4 w-4" />
                    <span>Tap to upload audio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => handleFile(idx, e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addEpisode}
              disabled={!lastEpisodeReady}
              className="w-full rounded-xl border border-dashed border-border bg-card py-3 text-sm font-semibold text-primary-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              ＋ Add next episode
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-full bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload story"}
          </button>
        </form>
      </div>
    </PhoneShell>
  );
};

export default AdminUpload;
