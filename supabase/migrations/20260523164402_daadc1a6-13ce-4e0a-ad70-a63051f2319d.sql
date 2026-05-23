ALTER TABLE public.child_profiles ADD COLUMN IF NOT EXISTS last_theme TEXT;
ALTER TABLE public.child_profiles ADD COLUMN IF NOT EXISTS last_occasion TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS parent_summary TEXT;