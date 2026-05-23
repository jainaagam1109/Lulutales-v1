-- ============================================================
-- Lulutales — Schema migration to your own Supabase project
-- Run this in: Supabase Dashboard → SQL Editor (project lidbfkytoajumnhwlcry)
-- Run ONCE on a fresh project. Safe to run on an empty database.
-- ============================================================

-- ---------- TABLES ----------

CREATE TABLE IF NOT EXISTS public.child_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  name                 text NOT NULL,
  age                  integer NOT NULL,
  gender               text,
  city                 text,
  family_type          text,
  family_address_terms text,
  family_members       text,
  home_type            text,
  personality          text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stories (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  theme             text,
  description       text,
  age_group         text,
  thumbnail         text,
  story_text        text,
  story_type        text DEFAULT 'pre_recorded',
  generation_params jsonb,
  is_generated      boolean NOT NULL DEFAULT false,
  is_featured       boolean NOT NULL DEFAULT false,
  child_profile_id  uuid,
  owner_profile_id  uuid,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.episodes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id       uuid NOT NULL,
  episode_number integer NOT NULL,
  title          text NOT NULL,
  description    text,
  audio_url      text,
  duration       integer,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.story_tags (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  tag      text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.story_analytics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL,
  story_id        uuid NOT NULL,
  episode_id      uuid,
  event_type      text NOT NULL,
  position_seconds integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_library (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  story_id   uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- HELPER FUNCTIONS (SECURITY DEFINER) ----------

CREATE OR REPLACE FUNCTION public.owns_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.child_profiles
    WHERE id = _profile_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_story(_story_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = _story_id
      AND (s.owner_profile_id IS NULL OR public.owns_profile(s.owner_profile_id))
  );
$$;

-- ---------- ENABLE RLS ----------

ALTER TABLE public.child_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library    ENABLE ROW LEVEL SECURITY;

-- ---------- POLICIES: child_profiles ----------

CREATE POLICY "Users view own child profiles"   ON public.child_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own child profiles" ON public.child_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own child profiles" ON public.child_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own child profiles" ON public.child_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------- POLICIES: stories ----------

CREATE POLICY "View global or owned stories" ON public.stories
  FOR SELECT TO authenticated
  USING (owner_profile_id IS NULL OR public.owns_profile(owner_profile_id));

CREATE POLICY "Insert stories" ON public.stories
  FOR INSERT TO authenticated
  WITH CHECK (owner_profile_id IS NULL OR public.owns_profile(owner_profile_id));

CREATE POLICY "Update own stories" ON public.stories
  FOR UPDATE TO authenticated
  USING (owner_profile_id IS NOT NULL AND public.owns_profile(owner_profile_id));

CREATE POLICY "Delete own stories" ON public.stories
  FOR DELETE TO authenticated
  USING (owner_profile_id IS NOT NULL AND public.owns_profile(owner_profile_id));

-- ⚠️ SECURITY NOTE: The original project also has a permissive policy
--    "Anyone can update stories" (FOR UPDATE TO public USING (true)).
--    This allows ANY user (even anonymous) to update ANY story row.
--    It is INTENTIONALLY OMITTED below. Uncomment ONLY if you really need it.
-- CREATE POLICY "Anyone can update stories" ON public.stories FOR UPDATE TO public USING (true);

-- ---------- POLICIES: episodes ----------

CREATE POLICY "View episodes of accessible stories"   ON public.episodes FOR SELECT TO authenticated USING (public.can_access_story(story_id));
CREATE POLICY "Insert episodes for accessible stories" ON public.episodes FOR INSERT TO authenticated WITH CHECK (public.can_access_story(story_id));
CREATE POLICY "Update episodes of accessible stories" ON public.episodes FOR UPDATE TO authenticated USING (public.can_access_story(story_id));
CREATE POLICY "Delete episodes of accessible stories" ON public.episodes FOR DELETE TO authenticated USING (public.can_access_story(story_id));

-- ---------- POLICIES: story_tags ----------

CREATE POLICY "View tags of accessible stories"   ON public.story_tags FOR SELECT TO authenticated USING (public.can_access_story(story_id));
CREATE POLICY "Insert tags for accessible stories" ON public.story_tags FOR INSERT TO authenticated WITH CHECK (public.can_access_story(story_id));
CREATE POLICY "Delete tags of accessible stories" ON public.story_tags FOR DELETE TO authenticated USING (public.can_access_story(story_id));

-- ---------- POLICIES: story_analytics ----------

CREATE POLICY "View own analytics"   ON public.story_analytics FOR SELECT TO authenticated USING (public.owns_profile(profile_id));
CREATE POLICY "Insert own analytics" ON public.story_analytics FOR INSERT TO authenticated WITH CHECK (public.owns_profile(profile_id));

-- ---------- POLICIES: user_library ----------

CREATE POLICY "View own library"   ON public.user_library FOR SELECT TO authenticated USING (public.owns_profile(profile_id));
CREATE POLICY "Insert own library" ON public.user_library FOR INSERT TO authenticated WITH CHECK (public.owns_profile(profile_id));
CREATE POLICY "Delete own library" ON public.user_library FOR DELETE TO authenticated USING (public.owns_profile(profile_id));

-- ---------- STORAGE: stories-audio bucket ----------

INSERT INTO storage.buckets (id, name, public)
VALUES ('stories-audio', 'stories-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for audio files; authenticated users can write.
CREATE POLICY "Public read stories-audio"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'stories-audio');

CREATE POLICY "Authenticated upload stories-audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories-audio');

CREATE POLICY "Authenticated update stories-audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stories-audio');

CREATE POLICY "Authenticated delete stories-audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stories-audio');
