// Re-export the auto-managed Supabase client so the whole app uses a single
// backend project. Previously this file pointed at a different Supabase
// project, which caused session tokens to be rejected (invalid JWT) when
// other modules used @/integrations/supabase/client for inserts (e.g.
// story_analytics). Keeping one client guarantees auth + data use the same
// project and the same session.
export { supabase } from "@/integrations/supabase/client";
