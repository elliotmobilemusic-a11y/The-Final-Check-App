import { FormEvent, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRememberPreference, setRememberPreference } from '../lib/authStorage';
import { hasSupabaseEnv, supabase } from '../lib/supabase';

export function LoginPage() {
  const { session } = useAuth();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const next = (location.state as { from?: string } | null)?.from;
    return next || '/dashboard';
  }, [location.state]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMeState] = useState(getRememberPreference());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (session) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setError('');
    setIsSubmitting(true);

    try {
      setRememberPreference(rememberMe);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-copy">
          <div className="auth-brand-row">
            <img
              src="/the-final-check-logo.png"
              alt="The Final Check logo"
              className="auth-brand-logo"
            />
            <div>
              <div className="brand-badge">Private access</div>
            </div>
          </div>

          <h1>The Final Check</h1>
          <p>
            Sign in to access your profit and performance consultancy workspace for food
            businesses. The layout is cleaner, the navigation is simpler, and access stays
            limited to approved users only.
          </p>

          <div className="feature-list">
            <div className="feature-chip">Modern top navigation</div>
            <div className="feature-chip">Cleaner, simpler layout</div>
            <div className="feature-chip">Protected client-only access</div>
            <div className="feature-chip">Remember me support</div>
          </div>
        </div>

        <div className="auth-card">
          <h2>Sign in</h2>
          <p className="muted-copy">
            Use the email and password for an approved Supabase user account.
          </p>

          {!hasSupabaseEnv ? (
            <div className="notice notice-warning">
              Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to
              your environment before testing sign-in.
            </div>
          ) : null}

          <form className="stack gap-16" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                autoComplete="email"
                className="input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="checkbox-row">
              <input
                checked={rememberMe}
                type="checkbox"
                onChange={(event) => setRememberMeState(event.target.checked)}
              />
              <span>Remember me on this device</span>
            </label>

            {error ? <div className="notice notice-danger">{error}</div> : null}

            <button
              className="button button-primary full-width"
              disabled={isSubmitting || !hasSupabaseEnv}
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}