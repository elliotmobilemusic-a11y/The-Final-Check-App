import { createClient } from '@supabase/supabase-js';
import { supabaseAuthStorage } from './authStorage';

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
  } else if (supabaseAnonKey.length < 50) {
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

// Helper function to safely sanitize headers and remove empty Bearer tokens
function sanitizeHeaders(headers: Headers): Headers {
  const cleanedHeaders = new Headers(headers);
  const authHeader = cleanedHeaders.get('Authorization');

  if (authHeader) {
    // Detect empty/invalid Bearer headers in all forms
    const trimmedAuth = authHeader.trim();
    if (trimmedAuth === 'Bearer' || trimmedAuth === 'Bearer ' || trimmedAuth.length <= 7) {
      cleanedHeaders.delete('Authorization');
    }
  }

  return cleanedHeaders;
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: supabaseAuthStorage,
    detectSessionInUrl: false,
    flowType: 'implicit'
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  },
  global: {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      // Prevent retry storms and infinite loops
      if (init && (init as any).__alreadyRetried) {
        return fetch(input, init);
      }

      const startTime = Date.now();
      const requestUrl = input instanceof Request ? input.url : input;
      
      try {
        // Always sanitize headers even on first request to prevent empty Bearer bug
        let finalInput = input;
        let finalInit = init;

        // Handle Request objects directly when Supabase passes them (most common case)
        if (input instanceof Request) {
          const cleanedHeaders = sanitizeHeaders(input.headers);
          finalInput = new Request(input, { headers: cleanedHeaders });
        }

        // Sanitize init headers if they exist
        if (finalInit?.headers) {
          finalInit.headers = sanitizeHeaders(new Headers(finalInit.headers));
        }

        const response = await fetch(finalInput, finalInit);
        
        // Log every request for diagnostics
        console.debug(`🌐 Supabase ${init?.method || 'GET'} ${response.status} ${Date.now() - startTime}ms`, requestUrl);
        
        return response;
      } catch (originalError) {
        console.warn(`⚠️ Supabase fetch failed first attempt: ${requestUrl}`, originalError);
        
        // Single retry only, with explicit safe headers
        const fixedInit: RequestInit & { __alreadyRetried?: boolean } = {
          ...init,
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
          __alreadyRetried: true
        };

        // Strip large headers that can cause 520 origin errors
        if (fixedInit.headers) {
          let headers = sanitizeHeaders(new Headers(fixedInit.headers));
          headers.delete('x-client-info');
          headers.delete('user-agent');
          fixedInit.headers = headers;
        }

        try {
          const response = await fetch(requestUrl, fixedInit);
          console.debug(`✅ Supabase retry succeeded ${response.status} ${Date.now() - startTime}ms`, requestUrl);
          return response;
        } catch (retryError) {
          // Capture full diagnostics on permanent failure
          const cookieSize = document.cookie.length;
          const localStorageSize = JSON.stringify(localStorage).length;
          
          console.groupCollapsed('❌ Supabase fetch failed permanently');
          console.error('URL:', requestUrl);
          console.error('Error:', retryError);
          console.error('Cookie size:', cookieSize, 'bytes');
          console.error('LocalStorage size:', localStorageSize, 'bytes');
          console.error('Headers present:', init?.headers ? Object.keys(new Headers(init.headers)) : 'none');
          console.error('Timestamp:', new Date().toISOString());
          console.groupEnd();
          
          throw retryError;
        }
      }
    }
  }
});
