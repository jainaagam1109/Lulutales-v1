// Custom Supabase client pointing at the user-owned Supabase project.
// This file is NOT auto-managed (unlike src/integrations/supabase/client.ts).
// Update the URL/anon key here when rotating credentials.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = "https://lidbfkytoajumnhwlcry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZGJma3l0b2FqdW1uaHdsY3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MTgxNzYsImV4cCI6MjA5NDQ5NDE3Nn0.Inz3Yd_6zf-3KC1zORTZGoi-gW4AKkM9MsamaEQ41g0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
