import { PropsWithChildren, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    // Only allow children to mount after session is fully validated and settled
    // Prevents Supabase SDK from sending requests with partial/stale auth state
    if (session?.access_token?.trim() && !loading) {
      // Force SDK to attach valid token to all subsequent requests
      supabase.auth.setSession(session);
      setValidated(true);
    }
  }, [session, loading]);

  if (loading || (session?.access_token?.trim() && !validated)) {
    return (
      <div className="screen-center">
        <div className="loading-card">
          <div className="spinner" />
          <p>Loading The Final Check...</p>
        </div>
      </div>
    );
  }

  if (!session?.access_token?.trim()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}