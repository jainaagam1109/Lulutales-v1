DROP POLICY IF EXISTS "Anyone can read episode audio" ON storage.objects;

CREATE POLICY "Update tags of accessible stories" ON public.story_tags
  FOR UPDATE TO authenticated
  USING (public.can_access_story(story_id))
  WITH CHECK (public.can_access_story(story_id));