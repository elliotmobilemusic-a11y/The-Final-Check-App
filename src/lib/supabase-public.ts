import { createClient } from '@supabase/supabase-js';

/**
 * ✅ Anonymous public Supabase client
 * For use ONLY on public unauthenticated routes (intake links, shared reports)
 * Does NOT attempt session refresh, does NOT persist auth state
 * Will NEVER cause phantom CORS errors
 */
export const supabasePublic = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public'
    }
  }
);