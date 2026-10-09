import { useState } from "react";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const REASONS = [
  { value: "not_right", label: "Not right for my child" },
  { value: "names_details", label: "Mistake in names or details" },
  { value: "audio", label: "Audio problem" },
  { value: "other", label: "Something else" },
] as const;

/** Bottom sheet for a parent to report a problem with a story. Saved for the team to review. */
export const ReportSheet = ({
  storyId,
  storyTitle,
  episodeNumber,
  onClose,
}: {
  storyId: string;
  storyTitle: string;
  episodeNumber?: number | null;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!reason || !user || sending) return;
    setSending(true);
    const { error } = await (supabase as any).from("story_reports").insert({
      user_id: user.id,
      story_id: storyId,
      episode_number: episodeNumber ?? null,
      reason,
      note: note.trim() || null,
    });
    setSending(false);
    if (error) {
      console.error("[ReportSheet] insert failed", error);
      toast.error("We couldn’t send that. Please try again, or email hello@lulutales.in.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={onClose}>
      <div
        className="w-full max-w-[460px] rounded-t-[28px] bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-foreground md:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="report-title" className="font-[Quicksand] text-[22px] font-bold">
              {sent ? "Thank you" : "What’s wrong with this story?"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {storyTitle}
              {episodeNumber ? ` · Episode ${episodeNumber}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <>
            <p className="mt-4 text-[15px] text-muted-foreground">
              We’ve got your report. We read every report within a day and reply by email.
            </p>
            <button type="button" onClick={onClose} className="mt-5 w-full bg-primary text-primary-foreground">
              Done
            </button>
          </>
        ) : (
          <>
            <div role="radiogroup" aria-label="Reason" className="mt-4 flex flex-col gap-2">
              {REASONS.map((r) => {
                const on = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setReason(r.value)}
                    className={`flex min-h-12 items-center justify-between rounded-2xl border-2 px-4 text-left text-[15px] font-semibold ${
                      on ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    {r.label}
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? "border-primary bg-primary" : "border-border"}`}>
                      {on && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-semibold">Tell us more <span className="font-normal text-muted-foreground">(optional)</span></span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                rows={3}
                className="mt-1.5 w-full rounded-2xl border border-border bg-background p-3 text-[15px] focus:border-primary focus:outline-none"
              />
            </label>
            <button type="button" disabled={!reason || sending} onClick={send} className="mt-4 w-full bg-primary text-primary-foreground disabled:opacity-50">
              {sending ? "Sending…" : "Send report"}
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">We read every report within a day and reply by email.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportSheet;
