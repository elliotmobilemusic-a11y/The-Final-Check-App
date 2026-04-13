import { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { resetSupabaseAuthState } from '../lib/authStorage';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const authClient = supabase;
    let attemptedMetadataRepair = false;

    const handleBrokenAuthState = () => {
      resetSupabaseAuthState(
        'Your previous browser session could not be restored cleanly. Please sign in again.'
      );
      setSession(null);
    };

    const attemptProfileRepair = async (accessToken?: string | null) => {
      if (!accessToken || attemptedMetadataRepair) return;
      attemptedMetadataRepair = true;

      try {
        await fetch('/api/repair-auth-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ accessToken })
        });
      } catch {
        // Ignore repair failures and continue with the normal auth reset.
      }
    };

    const shouldResetAuth = (error: unknown) => {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      return (
        message.includes('failed to fetch') ||
        message.includes('auth session missing') ||
        message.includes('invalid refresh token') ||
        message.includes('invalid claim') ||
        message.includes('jwt') ||
        message.includes('session') ||
        message.includes('refresh token')
      );
    };

    authClient.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;

        // ✅ Only accept valid sessions with proper JWT access token
        const hasValidToken = data.session?.access_token?.trim() 
          && data.session.access_token.length > 100
          && data.session.access_token.split('.').length === 3;

        if (hasValidToken) {
          setSession(data.session);
        } else {
          // Reject partial / broken / malformed sessions completely
          setSession(null);
        }
      })
      .catch((error) => {
        // Only reset auth state for clear unrecoverable session errors
        if (shouldResetAuth(error)) {
          handleBrokenAuthState();
        }

        setSession(null);
      })
      .finally(() => setLoading(false));

    const {
      data: { subscription }
    } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      // ✅ Only accept sessions that have valid non-empty access token
      if (nextSession?.access_token?.trim()) {
        setSession(nextSession);
      } else {
        setSession(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
