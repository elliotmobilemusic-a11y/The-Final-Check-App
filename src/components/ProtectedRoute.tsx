import { PropsWithChildren, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CookingLoader } from './layout/CookingLoader';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <CookingLoader
        detail="Checking your session and setting up the workspace before we open the app."
        kicker="Opening station"
        title="Loading The Final Check"
      />
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
