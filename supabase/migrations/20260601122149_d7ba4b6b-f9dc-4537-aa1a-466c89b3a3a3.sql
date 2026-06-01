ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS scoring_status text,
  ADD COLUMN IF NOT EXISTS generation_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS stories_is_generated_scoring_status_idx
  ON public.stories (is_generated, scoring_status);