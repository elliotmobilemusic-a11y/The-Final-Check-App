import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Environment validation with safe logging
const validateSupabaseConfig = () => {
  const errors: string[] = [];
  
  if (!supabaseUrl) {
    errors.push('❌ VITE_SUPABASE_URL is missing from environment variables');
  } else if (!supabaseUrl.includes('supabase.co')) {
    errors.push(`❌ VITE_SUPABASE_URL does not appear to be a valid Supabase URL: ${supabaseUrl}`);
  }

  if (!supabaseAnonKey) {
    errors.push('❌ VITE_SUPABASE_ANON_KEY is missing from environment variables');
  } else if (supabaseAnonKey.length < 20 && !supabaseAnonKey.startsWith('sb_')) {
    errors.push('❌ VITE_SUPABASE_ANON_KEY appears to be incomplete or invalid');
  }

  if (errors.length > 0) {
    console.error('══════════════════════════════════════════════════');
    console.error('SUPABASE CONFIGURATION ERROR - APP WILL NOT WORK');
    console.error('══════════════════════════════════════════════════');
    errors.forEach(err => console.error(err));
    
    if (supabaseAnonKey) {
      console.error(`🔑 Using anon key starting with: ${supabaseAnonKey.substring(0, 20)}...`);
    }
    if (supabaseUrl) {
      console.error(`🔗 Using Supabase URL: ${supabaseUrl}`);
    }
    
    console.error('══════════════════════════════════════════════════');
    console.error('Supabase is reachable; the failure is due to an invalid API key/config mismatch.');
    console.error('══════════════════════════════════════════════════');
    
    return false;
  }

  console.log(`✅ Supabase configured: ${supabaseUrl}`);
  if (supabaseAnonKey) {
    console.log(`✅ Anon key loaded: ${supabaseAnonKey.substring(0, 12)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 6)}`);
  }
  
  return true;
};

const configValid = validateSupabaseConfig();

export const hasSupabaseEnv = configValid;

// Never return null - fail loudly with clear error instead of silent failures
if (!configValid) {
  throw new Error('Supabase configuration is invalid. Check browser console for details.');
}



import { supabaseAuthStorage } from './authStorage';

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: supabaseAuthStorage
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  }
});
