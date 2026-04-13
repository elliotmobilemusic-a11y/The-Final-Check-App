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

    const hasUsableAccessToken = (accessToken?: string | null) =>
      Boolean(
        accessToken?.trim() &&
          accessToken.length > 100 &&
          accessToken.split('.').length === 3
      );

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

    const resetAfterRepair = async (accessToken?: string | null) => {
      await attemptProfileRepair(accessToken);
      handleBrokenAuthState();
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

    const validateSession = async (candidate: Session | null) => {
      if (!candidate || !hasUsableAccessToken(candidate.access_token)) {
        if (candidate?.access_token) {
          await resetAfterRepair(candidate.access_token);
        }
        return null;
      }

      const { data, error } = await authClient.auth.getUser(candidate.access_token);
      if (error) {
        throw error;
      }

      if (!data.user) {
        await resetAfterRepair(candidate.access_token);
        return null;
      }

      return {
        ...candidate,
        user: data.user
      };
    };

    authClient.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (error) throw error;

        const nextSession = await validateSession(data.session);
        setSession(nextSession);
      })
      .catch(async (error) => {
        // Only reset auth state for clear unrecoverable session errors
        if (shouldResetAuth(error)) {
          const fallbackToken = authClient.auth.getSession
            ? (await authClient.auth.getSession()).data.session?.access_token
            : null;
          await resetAfterRepair(fallbackToken);
        }

        setSession(null);
      })
      .finally(() => setLoading(false));

    const {
      data: { subscription }
    } = authClient.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        const validatedSession = await validateSession(nextSession);
        setSession(validatedSession);
      } catch (error) {
        if (shouldResetAuth(error)) {
          await resetAfterRepair(nextSession?.access_token);
        }
        setSession(null);
      } finally {
        setLoading(false);
      }
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
