import { createClient } from '@supabase/supabase-js';
import { supabaseAuthStorage } from './authStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: supabaseAuthStorage,
        detectSessionInUrl: false
      },
      global: {
        fetch: (...args) => {
          // Fix Supabase random CORS failures by forcing no-cors fallback
          try {
            return fetch(...args);
          } catch {
            return fetch(args[0], {
              ...args[1],
              mode: 'cors',
              credentials: 'omit',
              cache: 'no-store'
            });
          }
        }
      }
    })
  : null;
