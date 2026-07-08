ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS bucket_key TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;