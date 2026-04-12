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
      .then(async ({ data, error }) => {
        if (error) throw error;

        if (!data.session) {
          setSession(null);
          return;
        }

        const { data: userData, error: userError } = await authClient.auth.getUser();
        if (userError) throw userError;

        setSession(userData.user ? data.session : null);
      })
      .catch(async (error) => {
        if (shouldResetAuth(error)) {
          const { data } = await authClient.auth.getSession().catch(() => ({ data: { session: null } }));
          await attemptProfileRepair(data?.session?.access_token);
          handleBrokenAuthState();
          return;
        }

        setSession(null);
      })
      .finally(() => setLoading(false));

    const {
      data: { subscription }
    } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(nextSession);
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
