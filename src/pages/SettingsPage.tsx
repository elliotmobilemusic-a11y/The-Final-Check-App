import { FormEvent, useEffect, useMemo, useState } from 'react';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import {
  type LandingPage,
  themeOptions,
  type ThemeMode,
  usePreferences
} from '../context/PreferencesContext';
import { getRememberPreference, setRememberPreference } from '../lib/authStorage';
import { supabase } from '../lib/supabase';

type ThemePreview = {
  value: ThemeMode;
  accentClass: string;
};

const themePreviewClasses: ThemePreview[] = [
  { value: 'sandstone', accentClass: 'theme-preview-sandstone' },
  { value: 'coastal', accentClass: 'theme-preview-coastal' },
  { value: 'cedar', accentClass: 'theme-preview-cedar' },
  { value: 'sunrise', accentClass: 'theme-preview-sunrise' },
  { value: 'midnight', accentClass: 'theme-preview-midnight' }
];

const landingPages: Array<{ value: LandingPage; label: string }> = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/clients', label: 'Clients' },
  { value: '/audit', label: 'Audit tool' },
  { value: '/menu', label: 'Menu builder' },
  { value: '/settings', label: 'Settings' }
];

function deriveDisplayName(email?: string | null) {
  if (!email) return 'Approved user';
  return email.split('@')[0].replace(/[._-]+/g, ' ');
}

function getInitials(name: string) {
  const pieces = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!pieces.length) return 'TF';
  return pieces.map((piece) => piece[0]?.toUpperCase() ?? '').join('');
}

export function SettingsPage() {
  const { session } = useAuth();
  const { preferences, updatePreferences, resetDevicePreferences } = usePreferences();
  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [avatarUrl, setAvatarUrl] = useState(preferences.avatarUrl);
  const [theme, setTheme] = useState<ThemeMode>(preferences.theme);
  const [defaultLandingPage, setDefaultLandingPage] = useState<LandingPage>(
    preferences.defaultLandingPage
  );
  const [rememberMe, setRememberMe] = useState(getRememberPreference());
  const [compactMode, setCompactMode] = useState(preferences.compactMode);
  const [reducedMotion, setReducedMotion] = useState(preferences.reducedMotion);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('Settings ready.');

  useEffect(() => {
    setDisplayName(preferences.displayName);
    setAvatarUrl(preferences.avatarUrl);
    setTheme(preferences.theme);
    setDefaultLandingPage(preferences.defaultLandingPage);
    setCompactMode(preferences.compactMode);
    setReducedMotion(preferences.reducedMotion);
    setRememberMe(getRememberPreference());
  }, [preferences]);

  const effectiveDisplayName = useMemo(
    () =>
      displayName.trim() ||
      preferences.displayName ||
      deriveDisplayName(session?.user.email),
    [displayName, preferences.displayName, session?.user.email]
  );
  const avatarPreview = avatarUrl.trim() || preferences.avatarUrl;
  const currentTheme = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword && newPassword.length < 8) {
      setMessage('Use at least 8 characters if you want to change the password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('The password confirmation does not match.');
      return;
    }

    try {
      setIsSaving(true);

      if (supabase && session) {
        const { error } = await supabase.auth.updateUser({
          data: {
            display_name: displayName.trim(),
            avatar_url: avatarUrl.trim()
          },
          ...(newPassword ? { password: newPassword } : {})
        });

        if (error) throw error;
      }

      updatePreferences({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
        theme,
        defaultLandingPage,
        compactMode,
        reducedMotion
      });
      setRememberPreference(rememberMe);
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Settings saved and remembered on this device.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save settings.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleResetDevicePreferences() {
    resetDevicePreferences();
    setRememberPreference(true);
    setRememberMe(true);
    setTheme('sandstone');
    setDefaultLandingPage('/dashboard');
    setCompactMode(false);
    setReducedMotion(false);
    setMessage('Device preferences reset to default.');
  }

  return (
    <div className="page-stack settings-page">
      <section className="page-heading settings-hero">
        <div className="settings-hero-grid">
          <div className="settings-hero-copy">
            <div className="brand-badge">Settings</div>
            <h2>Control your account, theme, and device behaviour</h2>
            <p>
              This is where you shape how the app feels day to day: update your display
              name and profile image, pick a theme, control what the app remembers on this
              device, and set the way you want the workspace to open.
            </p>

            <div className="hero-actions">
              <button className="button button-primary" form="settings-form" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save settings'}
              </button>
              <button className="button button-secondary" onClick={handleResetDevicePreferences}>
                Reset device preferences
              </button>
            </div>
          </div>

          <div className="settings-profile-card">
            <div className="settings-profile-top">
              {avatarPreview ? (
                <img
                  alt={`${effectiveDisplayName} avatar`}
                  className="settings-avatar"
                  src={avatarPreview}
                />
              ) : (
                <div className="settings-avatar settings-avatar-fallback">
                  {getInitials(effectiveDisplayName)}
                </div>
              )}

              <div className="settings-profile-copy">
                <span className="soft-pill">Profile preview</span>
                <strong>{effectiveDisplayName}</strong>
                <p>{session?.user.email ?? 'No email available'}</p>
              </div>
            </div>

            <div className="settings-theme-pill">
              <strong>Current theme</strong>
              <span>{currentTheme.label}</span>
              <small>{currentTheme.description}</small>
            </div>

            <div className="settings-profile-meta">
              <div>
                <span>Landing page</span>
                <strong>
                  {landingPages.find((item) => item.value === defaultLandingPage)?.label ??
                    'Dashboard'}
                </strong>
              </div>
              <div>
                <span>Remember me</span>
                <strong>{rememberMe ? 'Enabled' : 'Session only'}</strong>
              </div>
              <div>
                <span>Layout density</span>
                <strong>{compactMode ? 'Compact' : 'Comfortable'}</strong>
              </div>
              <div>
                <span>Motion</span>
                <strong>{reducedMotion ? 'Reduced' : 'Standard'}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid compact">
        <StatCard
          label="Signed in as"
          value={effectiveDisplayName}
          hint={session?.user.email ?? 'No account email'}
        />
        <StatCard
          label="Theme"
          value={currentTheme.label}
          hint="Remembered on this device"
        />
        <StatCard
          label="Start page"
          value={landingPages.find((item) => item.value === defaultLandingPage)?.label ?? 'Dashboard'}
          hint="Used when there is no redirected route"
        />
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <form className="panel" id="settings-form" onSubmit={handleSave}>
            <div className="panel-header">
              <div>
                <h3>Account and workspace settings</h3>
                <p className="muted-copy">
                  Keep your visible account details and everyday workspace preferences in one place.
                </p>
              </div>
              <div className="soft-pill">{message}</div>
            </div>

            <div className="panel-body stack gap-20">
              <section className="sub-panel">
                <div className="sub-panel-header">
                  <h4>Account profile</h4>
                  <span className="soft-pill">Visible in the app shell</span>
                </div>

                <div className="form-grid two-columns">
                  <label className="field">
                    <span>Display name</span>
                    <input
                      className="input"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Avatar image URL</span>
                    <input
                      className="input"
                      placeholder="https://..."
                      value={avatarUrl}
                      onChange={(event) => setAvatarUrl(event.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Account email</span>
                    <input
                      className="input"
                      disabled
                      value={session?.user.email ?? ''}
                    />
                  </label>

                  <label className="field">
                    <span>User ID</span>
                    <input className="input" disabled value={session?.user.id ?? ''} />
                  </label>
                </div>
              </section>

              <section className="sub-panel">
                <div className="sub-panel-header">
                  <h4>Theme and appearance</h4>
                  <span className="soft-pill">Remembered on this device</span>
                </div>

                <div className="settings-theme-grid">
                  {themeOptions.map((option) => {
                    const preview = themePreviewClasses.find((item) => item.value === option.value);
                    return (
                      <button
                        className={`settings-theme-card ${theme === option.value ? 'active' : ''}`}
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        type="button"
                      >
                        <div className={`settings-theme-preview ${preview?.accentClass ?? ''}`} />
                        <strong>{option.label}</strong>
                        <p>{option.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="settings-toggle-grid">
                  <label className="settings-toggle-card">
                    <div>
                      <strong>Compact layout</strong>
                      <p>Tighten spacing across panels and forms when you want more on screen.</p>
                    </div>
                    <input
                      checked={compactMode}
                      type="checkbox"
                      onChange={(event) => setCompactMode(event.target.checked)}
                    />
                  </label>

                  <label className="settings-toggle-card">
                    <div>
                      <strong>Reduced motion</strong>
                      <p>Calm down transitions and movement for a steadier working experience.</p>
                    </div>
                    <input
                      checked={reducedMotion}
                      type="checkbox"
                      onChange={(event) => setReducedMotion(event.target.checked)}
                    />
                  </label>
                </div>
              </section>

              <section className="sub-panel">
                <div className="sub-panel-header">
                  <h4>Device and workflow preferences</h4>
                  <span className="soft-pill">Startup behaviour</span>
                </div>

                <div className="form-grid two-columns">
                  <label className="field">
                    <span>Default landing page</span>
                    <select
                      className="input"
                      value={defaultLandingPage}
                      onChange={(event) =>
                        setDefaultLandingPage(event.target.value as LandingPage)
                      }
                    >
                      {landingPages.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="settings-remember-card">
                    <div>
                      <strong>Remember me on this device</strong>
                      <p>
                        Keep the browser signed in between sessions instead of treating each login
                        as temporary.
                      </p>
                    </div>
                    <input
                      checked={rememberMe}
                      type="checkbox"
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                  </label>
                </div>
              </section>

              <section className="sub-panel">
                <div className="sub-panel-header">
                  <h4>Password update</h4>
                  <span className="soft-pill">Optional</span>
                </div>

                <div className="form-grid two-columns">
                  <label className="field">
                    <span>New password</span>
                    <input
                      className="input"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Confirm new password</span>
                    <input
                      className="input"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </label>
                </div>
              </section>
            </div>
          </form>
        </div>

        <aside className="workspace-side stack gap-20">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>What these settings do</h3>
                <p className="muted-copy">
                  A quick explanation of the most important controls in this page.
                </p>
              </div>
            </div>

            <div className="panel-body stack gap-12">
              <div className="settings-note-card">
                <strong>Display name and avatar</strong>
                <p>These personalise the shell and make the workspace feel like your own account.</p>
              </div>
              <div className="settings-note-card">
                <strong>Theme selection</strong>
                <p>Your chosen theme is saved on this device, so the app opens the same way next time.</p>
              </div>
              <div className="settings-note-card">
                <strong>Default landing page</strong>
                <p>
                  This controls where the app sends you when there is no deeper page redirect waiting.
                </p>
              </div>
              <div className="settings-note-card">
                <strong>Remember me</strong>
                <p>
                  This affects whether sign-in persists in local storage or stays session-only on the device.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
