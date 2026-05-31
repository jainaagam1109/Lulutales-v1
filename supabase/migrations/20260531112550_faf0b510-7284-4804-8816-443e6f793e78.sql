
-- 1. Enable RLS on unprotected tables
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- 2. Remove dangerous public update policy on stories
DROP POLICY IF EXISTS "Anyone can update stories" ON public.stories;

-- 3. Roles infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- Seed existing admin from previous hardcoded email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'aagam_jain2022@pgp.isb.edu'
ON CONFLICT DO NOTHING;

-- 4. Tighten stories policies: only admins can write global (no-owner) stories
DROP POLICY IF EXISTS "Insert stories" ON public.stories;
CREATE POLICY "Insert stories"
  ON public.stories FOR INSERT TO authenticated
  WITH CHECK (
    (owner_profile_id IS NULL AND public.is_admin())
    OR (owner_profile_id IS NOT NULL AND public.owns_profile(owner_profile_id))
  );

DROP POLICY IF EXISTS "Update own stories" ON public.stories;
CREATE POLICY "Update stories"
  ON public.stories FOR UPDATE TO authenticated
  USING (
    (owner_profile_id IS NULL AND public.is_admin())
    OR (owner_profile_id IS NOT NULL AND public.owns_profile(owner_profile_id))
  )
  WITH CHECK (
    (owner_profile_id IS NULL AND public.is_admin())
    OR (owner_profile_id IS NOT NULL AND public.owns_profile(owner_profile_id))
  );

DROP POLICY IF EXISTS "Delete own stories" ON public.stories;
CREATE POLICY "Delete stories"
  ON public.stories FOR DELETE TO authenticated
  USING (
    (owner_profile_id IS NULL AND public.is_admin())
    OR (owner_profile_id IS NOT NULL AND public.owns_profile(owner_profile_id))
  );

-- 5. Storage: restrict write operations on stories-audio to admins
DROP POLICY IF EXISTS "Anyone can upload episode audio" ON storage.objects;
DROP POLICY IF EXISTS "Public upload stories-audio" ON storage.objects;

CREATE POLICY "Admin upload stories-audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories-audio' AND public.is_admin());

CREATE POLICY "Admin update stories-audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stories-audio' AND public.is_admin())
  WITH CHECK (bucket_id = 'stories-audio' AND public.is_admin());

CREATE POLICY "Admin delete stories-audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stories-audio' AND public.is_admin());
