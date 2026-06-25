import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { StoryStatusCard } from "@/components/StoryStatusCard";
import { getStoryStatus } from "@/lib/storyStatus";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const MAX_WAIT_MS = 10 * 60 * 1000;

const Generating = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const nav = useNavigate();
  const [story, setStory] = useState<Tables<"stories"> | null>(null);
  const [stalled, setStalled] = useState(false);
  const [childName, setChildName] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("lulutales_child_name") ?? "your child" : "your child"
  );
  const doneRef = useRef(false);
  const autoRedirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoRedirect = () => {
    if (autoRedirectRef.current) {
      clearTimeout(autoRedirectRef.current);
      autoRedirectRef.current = null;
    }
  };

  useEffect(() => {
    autoRedirectRef.current = setTimeout(() => {
      nav("/happy-place");
    }, 30000);
    return () => clearAutoRedirect();
  }, [nav]);


  useEffect(() => {
    if (!storyId) return;
    let cancelled = false;

    const fetchStory = async () => {
      const { data } = await supabase.from("stories").select("*").eq("id", storyId).maybeSingle();
      if (cancelled || !data) return;
      setStory(data);

      if (data.child_profile_id) {
        const { data: kid } = await supabase
          .from("child_profiles")
          .select("name")
          .eq("id", data.child_profile_id)
          .maybeSingle();
        if (!cancelled && kid?.name) setChildName(kid.name);
      }

      if (data.is_generated && !doneRef.current) {
        doneRef.current = true;
        clearAutoRedirect();
        toast.success("Your story is ready!");
        const dest = data.story_type === "bedtime_text" ? `/bedtime/${storyId}` : `/story/${storyId}`;
        setTimeout(() => nav(dest, { replace: true }), 1500);
        return;
      }


      const ageMs = Date.now() - new Date(data.created_at).getTime();
      if (!data.is_generated && ageMs > MAX_WAIT_MS) {
        setStalled(true);
      }
    };

    fetchStory();
    const id = setInterval(fetchStory, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [storyId, nav]);

  const status = story ? getStoryStatus(story) : "preparing";
  const showFailure = status === "stale" || status === "lang_age_failed";

  useEffect(() => {
    if (showFailure) clearAutoRedirect();
  }, [showFailure]);


  return (
    <PhoneShell>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-10 text-center">
        {showFailure && story ? (
          <div className="w-full max-w-sm">
            <StoryStatusCard story={story} variant="row" />
            <button
              onClick={() => nav("/happy-place")}
              className="mt-6 w-full rounded-full border border-border bg-card px-5 py-2 text-xs font-semibold text-primary-deep"
            >
              Back to Story Worlds
            </button>
          </div>
        ) : (
          <>
            <div className="relative mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
              <Sparkles className="h-12 w-12 text-primary-foreground" />
              {!stalled && (
                <Loader2 className="absolute inset-0 m-auto h-32 w-32 animate-spin text-primary-foreground/40" />
              )}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-deep">
              {stalled ? "Still working" : "Creating magic"}
            </div>
            <h1 className="mt-2 text-xl font-extrabold text-foreground">
              {story?.title ?? "Your story"}
            </h1>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {stalled
                ? `This is taking longer than expected. We'll notify you when ${childName}'s story is ready.`
                : `This usually takes about ${
                    story?.story_type === "bedtime_text" ? "~4 minutes" : "~15 minutes"
                  }. Head to your Story Worlds and enjoy existing stories while you wait.`}
            </p>
            <button
              onClick={async () => {
                if (stalled && storyId) {
                  try {
                    await supabase
                      .from("stories")
                      .delete()
                      .eq("id", storyId)
                      .eq("is_generated", false);
                  } catch (_) {}
                  nav("/");
                  return;
                }
                nav("/happy-place");
              }}
              className="mt-8 rounded-full border border-border bg-card px-5 py-2 text-xs font-semibold text-primary-deep"
            >
              {stalled ? "Back to home" : "Go to My Happy Place →"}
            </button>
          </>
        )}
      </main>
    </PhoneShell>
  );
};

export default Generating;
