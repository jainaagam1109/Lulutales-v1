CREATE TABLE public.playback_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  episode_number int,
  position_seconds double precision NOT NULL DEFAULT 0,
  duration_seconds double precision,
  percent int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, story_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playback_progress TO authenticated;
GRANT ALL ON public.playback_progress TO service_role;

ALTER TABLE public.playback_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage playback progress"
  ON public.playback_progress
  FOR ALL
  TO authenticated
  USING (public.owns_profile(profile_id))
  WITH CHECK (public.owns_profile(profile_id));

CREATE INDEX playback_progress_profile_updated_idx
  ON public.playback_progress (profile_id, updated_at DESC);

CREATE TRIGGER update_playback_progress_updated_at
  BEFORE UPDATE ON public.playback_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
