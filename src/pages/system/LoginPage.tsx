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
  const [loginSuccess, setLoginSuccess] = useState(false);
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

      // Success animation state
      setLoginSuccess(true);
      
      // Add delay for animation before navigation
      await new Promise(resolve => setTimeout(resolve, 1200));

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
          <div className="auth-brand-textlock">
            <span>Consultancy operating system</span>
            <strong>The Final Check</strong>
            <small>Profit and performance consultancy for food businesses</small>
          </div>

          <p style={{ marginTop: '28px' }}>
            Sign in to manage clients, site reviews, menu work, billing, and follow-up from one
            secure workspace.
          </p>
          <div className="auth-side-note">
            <strong>Inside the system</strong>
            <p>Client records, audit work, menu reviews, and billing stay connected in one place.</p>
          </div>

          <div className="auth-feature-grid">
            <div className="auth-feature-card">
              <span>CRM</span>
              <strong>Client accounts</strong>
              <p>Sites, contacts, reviews, goals, and delivery history in one profile.</p>
            </div>
            <div className="auth-feature-card">
              <span>Delivery</span>
              <strong>Audit and menu workflows</strong>
              <p>Operational reviews and commercial menu analysis live in the same workspace.</p>
            </div>
            <div className="auth-feature-card">
              <span>Desktop</span>
              <strong>Installable workflow</strong>
              <p>Package the app for Mac and Windows and keep shipping updates as the system evolves.</p>
            </div>
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

          <form className={`stack gap-20 ${loginSuccess ? 'login-success' : ''}`} onSubmit={handleSubmit}>
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
              className={`button button-primary full-width ${isSubmitting ? 'loading' : ''} ${loginSuccess ? 'success' : ''}`}
              disabled={isSubmitting || !hasSupabaseEnv || loginSuccess}
            >
              {loginSuccess ? '✓ Welcome' : isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
