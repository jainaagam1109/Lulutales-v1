
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='profile_status') THEN
    CREATE TYPE public.profile_status AS ENUM ('active','inactive','deleted');
  END IF;
END $$;

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS status public.profile_status NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Backfill: for each user, the earliest created profile becomes active.
WITH ranked AS (
  SELECT id, user_id,
         row_number() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
  FROM public.child_profiles
)
UPDATE public.child_profiles cp
SET status = 'active', last_active_at = now()
FROM ranked r
WHERE cp.id = r.id AND r.rn = 1 AND cp.status <> 'deleted';

-- Partial unique index: at most one active per user.
CREATE UNIQUE INDEX IF NOT EXISTS child_profiles_one_active_per_user
  ON public.child_profiles(user_id)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.set_active_profile(_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  SELECT user_id INTO v_user FROM public.child_profiles
    WHERE id = _profile_id AND status <> 'deleted';
  IF v_user IS NULL OR v_user <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.child_profiles
    SET status = 'inactive'
    WHERE user_id = v_user AND status = 'active' AND id <> _profile_id;
  UPDATE public.child_profiles
    SET status = 'active', last_active_at = now()
    WHERE id = _profile_id;
  RETURN _profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_profile(_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_was_active boolean;
  v_next uuid;
BEGIN
  SELECT user_id, status = 'active' INTO v_user, v_was_active
    FROM public.child_profiles
    WHERE id = _profile_id AND status <> 'deleted';
  IF v_user IS NULL OR v_user <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.child_profiles
    SET status = 'deleted'
    WHERE id = _profile_id;

  IF v_was_active THEN
    SELECT id INTO v_next
      FROM public.child_profiles
      WHERE user_id = v_user AND status <> 'deleted'
      ORDER BY last_active_at DESC NULLS LAST, created_at DESC
      LIMIT 1;
    IF v_next IS NOT NULL THEN
      UPDATE public.child_profiles
        SET status = 'active', last_active_at = now()
        WHERE id = v_next;
    END IF;
  END IF;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_profile(uuid) TO authenticated;
