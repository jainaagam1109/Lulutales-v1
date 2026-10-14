import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Kind = "problem" | "delete";

const COPY: Record<Kind, { title: string; intro: string; label: string; placeholder: string; button: string; doneTitle: string; done: string }> = {
  problem: {
    title: "Report a problem",
    intro: "Tell us what went wrong. It comes straight to our team.",
    label: "What happened?",
    placeholder: "For example: the story stopped playing halfway",
    button: "Send",
    doneTitle: "Thank you",
    done: "We’ve got your message and will reply by email.",
  },
  delete: {
    title: "Delete your account?",
    intro:
      "This permanently deletes your account, your children’s details and every story made for them. It can’t be undone.",
    label: "Anything you’d like to tell us? (optional)",
    placeholder: "",
    button: "Send delete request",
    doneTitle: "Request received",
    done: "We’ll delete your account and email you once it’s done.",
  },
};

/**
 * In-app help: "Report a problem" and "Delete account" requests.
 * Saved to the same place as story reports, so they show up in Admin → Reports.
 * (Email links don't work on laptops without a mail app, so we don't rely on them.)
 */
export const HelpSheet = ({ kind, onClose }: { kind: Kind; onClose: () => void }) => {
  const { user } = useAuth();
  const c = COPY[kind];
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const canSend = kind === "delete" || note.trim().length > 0;

  const send = async () => {
    if (!user || sending || !canSend) return;
    setSending(true);
    const page = typeof window !== "undefined" ? window.location.pathname : "";
    const extra = kind === "problem" ? `\n\n(Sent from ${page})` : "";
    const { error } = await (supabase as any).from("story_reports").insert({
      user_id: user.id,
      story_id: null,
      reason: kind === "problem" ? "app_problem" : "delete_account",
      note: (note.trim() + extra).trim() || null,
    });
    setSending(false);
    if (error) {
      console.error("[HelpSheet] insert failed", error);
      toast.error("We couldn’t send that. Please write to hello@lulutales.in.");
      return;
    }
    setSent(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-t-[28px] bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-foreground md:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="help-title" className="font-[Quicksand] text-[22px] font-bold">
            {sent ? c.doneTitle : c.title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <>
            <p className="mt-2 text-[15px] text-muted-foreground">{c.done}</p>
            <button type="button" onClick={onClose} className="mt-5 w-full bg-primary text-primary-foreground">
              Done
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-[15px] text-muted-foreground">{c.intro}</p>
            <label className="mt-4 block">
              <span className="text-sm font-semibold">{c.label}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1500}
                rows={kind === "problem" ? 4 : 2}
                placeholder={c.placeholder}
                autoFocus={kind === "problem"}
                className="mt-1.5 w-full rounded-2xl border border-border bg-background p-3 text-[15px] focus:border-primary focus:outline-none"
              />
            </label>
            {user?.email && (
              <p className="mt-1 text-xs text-muted-foreground">We’ll reply to {user.email}.</p>
            )}
            <button
              type="button"
              disabled={!canSend || sending}
              onClick={send}
              className={`lt-card mt-4 flex min-h-12 w-full items-center justify-center rounded-full font-semibold disabled:opacity-50 ${
                kind === "delete" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {sending ? "Sending…" : c.button}
            </button>
            {kind === "delete" && (
              <button type="button" onClick={onClose} className="mt-2 min-h-12 w-full font-semibold text-primary">
                Keep my account
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HelpSheet;
