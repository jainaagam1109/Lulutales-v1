DROP POLICY IF EXISTS "View own saved stories" ON public.saved_stories;
DROP POLICY IF EXISTS "Insert own saved stories" ON public.saved_stories;
DROP POLICY IF EXISTS "Delete own saved stories" ON public.saved_stories;

CREATE POLICY "View own saved stories" ON public.saved_stories
  FOR SELECT TO authenticated
  USING (public.owns_profile(profile_id));

CREATE POLICY "Insert own saved stories" ON public.saved_stories
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_profile(profile_id));

CREATE POLICY "Delete own saved stories" ON public.saved_stories
  FOR DELETE TO authenticated
  USING (public.owns_profile(profile_id));