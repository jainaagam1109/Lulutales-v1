CREATE TABLE public.saved_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, story_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_stories TO authenticated;
GRANT ALL ON public.saved_stories TO service_role;

ALTER TABLE public.saved_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own saved stories"
  ON public.saved_stories FOR SELECT
  USING (public.owns_profile(profile_id));

CREATE POLICY "Insert own saved stories"
  ON public.saved_stories FOR INSERT
  WITH CHECK (public.owns_profile(profile_id));

CREATE POLICY "Delete own saved stories"
  ON public.saved_stories FOR DELETE
  USING (public.owns_profile(profile_id));

CREATE INDEX saved_stories_profile_idx ON public.saved_stories(profile_id, created_at DESC);