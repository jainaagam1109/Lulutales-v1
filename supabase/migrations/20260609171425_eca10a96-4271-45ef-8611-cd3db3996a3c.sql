DROP INDEX IF EXISTS public.child_profiles_one_active_per_user;

ALTER TABLE public.child_profiles
  DROP CONSTRAINT IF EXISTS child_profiles_one_active_per_user;

ALTER TABLE public.child_profiles
  ADD CONSTRAINT child_profiles_one_active_per_user
  EXCLUDE (user_id WITH =) WHERE (status = 'active')
  DEFERRABLE INITIALLY DEFERRED;