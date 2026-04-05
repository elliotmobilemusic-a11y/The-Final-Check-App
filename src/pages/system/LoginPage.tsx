import { FormEvent, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { getRememberPreference, setRememberPreference } from '../../lib/authStorage';
import { hasSupabaseEnv, supabase } from '../../lib/supabase';

export function LoginPage() {
  const { session } = useAuth();
  const { preferences } = usePreferences();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const next = (location.state as { from?: string } | null)?.from;
    return next || preferences.defaultLandingPage;
  }, [location.state, preferences.defaultLandingPage]);

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
              src="/the-final-check-brand-dark.png"
              alt="The Final Check"
              className="auth-brand-wordmark-dark"
            />
          </div>

          <h1>The Final Check</h1>
          <p>
            Sign in to access client records, audit reports, menu engineering, billing, and
            follow-up work in one secure system. Access is limited to approved users.
          </p>

          <div className="auth-stat-grid">
            <div className="auth-stat-card">
              <span>System</span>
              <strong>Client-first</strong>
              <small>Every audit and menu review can stay anchored to the right business.</small>
            </div>
            <div className="auth-stat-card">
              <span>Workflow</span>
              <strong>Joined up</strong>
              <small>Commercial, operational, and follow-up work live in one protected place.</small>
            </div>
            <div className="auth-stat-card">
              <span>Access</span>
              <strong>Approved only</strong>
              <small>Only approved account holders can access saved client and project data.</small>
            </div>
          </div>

          <div className="feature-list">
            <div className="feature-chip">Operational dashboard and client hub</div>
            <div className="feature-chip">Kitchen audit reports and action plans</div>
            <div className="feature-chip">Menu costing and GP review flow</div>
            <div className="feature-chip">Remember-me support on trusted devices</div>
          </div>

          <div className="auth-side-note">
            <strong>Inside the app</strong>
            <p>
              Use the dashboard to spot priority work, then move straight into client setup,
              audits, menu reviews, and account follow-up without switching systems.
            </p>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <div>
              <h2>Sign in</h2>
              <p className="muted-copy">
                Use the email and password for an approved account.
              </p>
            </div>
            <div className="auth-card-badge">Secure access</div>
          </div>

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

            <div className="auth-form-note">
              This keeps the browser signed in between sessions unless you explicitly sign out.
            </div>

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
