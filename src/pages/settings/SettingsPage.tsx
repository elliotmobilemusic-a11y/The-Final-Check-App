import { FormEvent, useEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import {
  type LandingPage,
  themeOptions,
  type ThemeMode,
  usePreferences
} from '../../context/PreferencesContext';
import { getRememberPreference, setRememberPreference } from '../../lib/authStorage';
import {
  checkForDesktopUpdates,
  getDesktopAppInfo,
  installDesktopUpdate,
  subscribeToDesktopUpdates,
  type DesktopAppInfo,
  type DesktopUpdateStatus
} from '../../lib/desktop';
import { supabase } from '../../lib/supabase';
import { saveAvatarUrl, uploadAvatar, updateProfile } from '../../services/profiles';

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
  { value: '/settings/profile', label: 'Settings' }
];

type SettingsSection = 'profile' | 'appearance' | 'security';

const settingsSections: Array<{
  value: SettingsSection;
  label: string;
  description: string;
}> = [
  {
    value: 'profile',
    label: 'Profile',
    description: 'Visible account details and identity shown in the app shell.'
  },
  {
    value: 'appearance',
    label: 'Appearance',
    description: 'Theme, spacing, motion, and visual working preferences.'
  },
  {
    value: 'security',
    label: 'Security',
    description: 'Password updates and sign-in persistence preferences.'
  }
];

function isSettingsSection(value?: string): value is SettingsSection {
  return value === 'profile' || value === 'appearance' || value === 'security';
}

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

function prettyThemeName(value: ThemeMode) {
  const selectedTheme = themeOptions.find((option) => option.value === value);
  return selectedTheme?.label ?? value;
}

export function SettingsPage() {
  const { section } = useParams();
  const { session } = useAuth();
  const { preferences, updatePreferences, resetDevicePreferences } = usePreferences();
  const activeSection = isSettingsSection(section) ? section : 'profile';

  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [avatarUrl, setAvatarUrl] = useState(preferences.avatarUrl);
  const [theme, setTheme] = useState<ThemeMode>(preferences.theme);
  const [defaultLandingPage, setDefaultLandingPage] = useState<LandingPage>(
    preferences.defaultLandingPage
  );
  const [rememberMe, setRememberMe] = useState(getRememberPreference());
  const [compactMode, setCompactMode] = useState(preferences.compactMode);
  const [reducedMotion, setReducedMotion] = useState(preferences.reducedMotion);
  const [autoShowNav, setAutoShowNav] = useState(preferences.autoShowNav);
  const [jobTitle, setJobTitle] = useState(preferences.jobTitle);
  const [organisation, setOrganisation] = useState(preferences.organisation);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('Settings ready.');
  const [desktopInfo, setDesktopInfo] = useState<DesktopAppInfo>({
    isDesktop: false,
    isPackaged: false,
    platform: 'web',
    version: 'web',
    canCheckForUpdates: false,
    updateConfigured: false
  });
  const [desktopStatus, setDesktopStatus] = useState<DesktopUpdateStatus>({
    state: 'idle',
    message: 'No update check has been run yet.'
  });
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarPosition] = useState({ x: 50, y: 50, scale: 1 });

  useEffect(() => {
    setDisplayName(preferences.displayName);
    setAvatarUrl(preferences.avatarUrl);
    setTheme(preferences.theme);
    setDefaultLandingPage(preferences.defaultLandingPage);
    setCompactMode(preferences.compactMode);
    setReducedMotion(preferences.reducedMotion);
    setAutoShowNav(preferences.autoShowNav);
    setJobTitle(preferences.jobTitle);
    setOrganisation(preferences.organisation);
    setRememberMe(getRememberPreference());
  }, [preferences]);

  useEffect(() => {
    let cancelled = false;

    getDesktopAppInfo().then((info) => {
      if (!cancelled) {
        setDesktopInfo(info);
      }
    });

    const unsubscribe = subscribeToDesktopUpdates((status) => {
      if (!cancelled) {
        setDesktopStatus(status);
        if (status.state !== 'checking' && status.state !== 'progress') {
          setIsCheckingUpdates(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const body = window.document.body;
    body.dataset.theme = theme;
    body.classList.toggle('compact-mode', compactMode);
    body.classList.toggle('reduced-motion', reducedMotion);

    return () => {
      body.dataset.theme = preferences.theme;
      body.classList.toggle('compact-mode', preferences.compactMode);
      body.classList.toggle('reduced-motion', preferences.reducedMotion);
    };
  }, [
    compactMode,
    preferences.compactMode,
    preferences.reducedMotion,
    preferences.theme,
    reducedMotion,
    theme
  ]);

  const effectiveDisplayName = useMemo(
    () => displayName.trim() || preferences.displayName || deriveDisplayName(session?.user.email),
    [displayName, preferences.displayName, session?.user.email]
  );
  const currentAvatarSrc = avatarPreview || avatarUrl.trim() || preferences.avatarUrl;
  const currentTheme = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const activeSectionMeta =
    settingsSections.find((item) => item.value === activeSection) ?? settingsSections[0];
  const profileCompleteness = [
    displayName.trim(),
    avatarUrl.trim() || avatarPreview,
    jobTitle.trim(),
    organisation.trim()
  ].filter(Boolean).length;
  const activeChanges = [
    theme !== preferences.theme,
    defaultLandingPage !== preferences.defaultLandingPage,
    compactMode !== preferences.compactMode,
    reducedMotion !== preferences.reducedMotion,
    autoShowNav !== preferences.autoShowNav,
    rememberMe !== getRememberPreference(),
    displayName.trim() !== preferences.displayName,
    avatarUrl.trim() !== preferences.avatarUrl,
    jobTitle.trim() !== preferences.jobTitle,
    organisation.trim() !== preferences.organisation,
    Boolean(newPassword)
  ].filter(Boolean).length;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setMessage('You need an active session before settings can be saved.');
      return;
    }

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

      let finalAvatarUrl = avatarUrl.trim();

      if (avatarPreview && supabase) {
        const response = await fetch(avatarPreview);
        const blob = await response.blob();
        const extension = blob.type.split('/')[1] || 'jpg';
        const file = new File([blob], `avatar.${extension}`, { type: blob.type });

        finalAvatarUrl = await uploadAvatar(file, session.user.id);
        await saveAvatarUrl(session.user.id, finalAvatarUrl);
      }

      await updateProfile(session.user.id, {
        display_name: displayName.trim(),
        avatar_position: avatarPosition,
        avatar_url: finalAvatarUrl,
        job_title: jobTitle.trim(),
        organisation: organisation.trim()
      });

      if (newPassword) {
        await supabase.auth.updateUser({ password: newPassword });
      }

      updatePreferences({
        displayName: displayName.trim(),
        avatarUrl: finalAvatarUrl,
        avatarPosition,
        jobTitle: jobTitle.trim(),
        organisation: organisation.trim(),
        theme,
        defaultLandingPage,
        compactMode,
        reducedMotion,
        autoShowNav
      });

      setRememberPreference(rememberMe);
      setAvatarPreview('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Settings saved successfully. Your profile and device preferences are in sync.');
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
    setAutoShowNav(true);
    setMessage('Device preferences reset to default.');
  }

  async function handleDesktopUpdateCheck() {
    setIsCheckingUpdates(true);
    const status = await checkForDesktopUpdates();
    setDesktopStatus(status);

    if (status.state !== 'checking' && status.state !== 'progress') {
      setIsCheckingUpdates(false);
    }
  }

  async function handleInstallDesktopUpdate() {
    await installDesktopUpdate();
  }

  return (
    <div className="page-stack settings-page">
      <PageIntro
        eyebrow="System settings"
        title="Control how the workspace looks, signs in, and travels with you."
        description="These settings combine profile identity, device defaults, and account security so the app feels stable whether you are on web or desktop."
        side={
          <div className="settings-profile-meta">
            <div>
              <span>Signed in as</span>
              <strong>{session?.user.email ?? 'No active session'}</strong>
            </div>
            <div>
              <span>Current theme</span>
              <strong>{currentTheme.label}</strong>
            </div>
          </div>
        }
      >
        <StatCard label="Profile fields" value={`${profileCompleteness}/4`} hint="Core profile details completed." />
        <StatCard label="Unsaved changes" value={String(activeChanges)} hint="Changes on this screen not yet saved." />
        <StatCard
          label="Default landing"
          value={landingPages.find((item) => item.value === defaultLandingPage)?.label ?? 'Dashboard'}
          hint="The first workspace you open after sign-in."
        />
        <StatCard
          label="Platform"
          value={desktopInfo.isDesktop ? 'Desktop' : 'Web'}
          hint="Current runtime environment."
        />
      </PageIntro>

      <nav className="settings-section-nav" aria-label="Settings sections">
        {settingsSections.map((item) => (
          <NavLink
            key={item.value}
            to={`/settings/${item.value}`}
            className={({ isActive }) => `settings-section-link ${isActive ? 'active' : ''}`}
          >
            <strong>{item.label}</strong>
          </NavLink>
        ))}
      </nav>

      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar-container">
            {currentAvatarSrc ? (
              <div className="profile-avatar-wrapper">
                <img
                  alt={`${effectiveDisplayName} avatar`}
                  className="profile-avatar"
                  src={currentAvatarSrc}
                  style={{
                    objectPosition: `${avatarPosition.x}% ${avatarPosition.y}%`,
                    transform: `scale(${avatarPosition.scale})`
                  }}
                />
              </div>
            ) : (
              <div className="profile-avatar profile-avatar-fallback">
                {getInitials(effectiveDisplayName)}
              </div>
            )}

            <div className="avatar-upload-controls">
              <label className="avatar-upload-button button button-secondary">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (readerEvent) => {
                      setAvatarPreview(String(readerEvent.target?.result ?? ''));
                    };
                    reader.readAsDataURL(file);
                  }}
                  hidden
                />
                Upload photo
              </label>
            </div>
          </div>

          <div className="profile-info">
            <h1>{effectiveDisplayName}</h1>
            <p className="muted-copy">{session?.user.email ?? 'No email available'}</p>

            <div className="profile-status-badges">
              <span className="soft-pill">{currentTheme.label} theme</span>
              <span className="soft-pill">
                {landingPages.find((item) => item.value === defaultLandingPage)?.label ?? 'Dashboard'} landing
              </span>
              <span className="soft-pill">{compactMode ? 'Compact' : 'Comfortable'} layout</span>
            </div>
          </div>
        </div>
      </div>

      <section className="workspace-grid full-width">
        <div className="workspace-main section-stack full-width">
          <form className="panel" id="settings-form" onSubmit={handleSave}>
            <div className="panel-header">
              <div>
                <h3>{activeSectionMeta.label}</h3>
                <p className="muted-copy">{activeSectionMeta.description}</p>
              </div>
            </div>

            <div className="panel-body stack gap-24">
              {activeSection === 'profile' ? (
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
                      <span>Account email</span>
                      <input className="input" disabled value={session?.user.email ?? ''} />
                    </label>

                    <label className="field">
                      <span>Job title</span>
                      <input
                        className="input"
                        placeholder="e.g. Auditor, Manager"
                        value={jobTitle}
                        onChange={(event) => setJobTitle(event.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>Organisation</span>
                      <input
                        className="input"
                        placeholder="Company name"
                        value={organisation}
                        onChange={(event) => setOrganisation(event.target.value)}
                      />
                    </label>

                    <label className="field">
                      <span>Profile photo URL</span>
                      <input
                        className="input"
                        placeholder="Or leave blank and upload a photo above"
                        value={avatarUrl}
                        onChange={(event) => setAvatarUrl(event.target.value)}
                      />
                    </label>
                  </div>
                </section>
              ) : null}

              {activeSection === 'appearance' ? (
                <>
                  <section className="sub-panel">
                    <div className="sub-panel-header">
                      <h4>Visual themes</h4>
                      <span className="soft-pill">Live preview</span>
                    </div>

                    <div className="settings-theme-grid">
                      {themePreviewClasses.map((previewTheme) => {
                        const option =
                          themeOptions.find((item) => item.value === previewTheme.value) ??
                          ({
                            value: previewTheme.value,
                            label: prettyThemeName(previewTheme.value),
                            description: 'Available theme preset.',
                            accentName: '',
                            mood: 'Custom preset',
                            bestFor: 'Available for workspace theming'
                          } satisfies (typeof themeOptions)[number]);

                        return (
                          <button
                            className={`settings-theme-card ${theme === option.value ? 'active' : ''}`}
                            key={option.value}
                            onClick={() => setTheme(option.value)}
                            type="button"
                          >
                            <div className={`settings-theme-preview ${previewTheme.accentClass}`}>
                              <span className="settings-theme-preview-bar" />
                              <span className="settings-theme-preview-pane" />
                            </div>
                            <strong>{option.label}</strong>
                            <p>{option.description}</p>
                            <div className="settings-theme-card-meta">
                              <span>{option.mood}</span>
                              <small>{option.bestFor}</small>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="sub-panel">
                    <div className="sub-panel-header">
                      <h4>Behaviour and accessibility</h4>
                      <span className="soft-pill">Device defaults</span>
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
                          <p>Calm down transitions and movement across the workspace.</p>
                        </div>
                        <input
                          checked={reducedMotion}
                          type="checkbox"
                          onChange={(event) => setReducedMotion(event.target.checked)}
                        />
                      </label>

                      <label className="settings-toggle-card">
                        <div>
                          <strong>Auto-show navigation</strong>
                          <p>Keep the top navigation responsive to scrolling and activity.</p>
                        </div>
                        <input
                          checked={autoShowNav}
                          type="checkbox"
                          onChange={(event) => setAutoShowNav(event.target.checked)}
                        />
                      </label>

                      <label className="field">
                        <span>Default landing page</span>
                        <select
                          className="input"
                          value={defaultLandingPage}
                          onChange={(event) => setDefaultLandingPage(event.target.value as LandingPage)}
                        >
                          {landingPages.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>
                </>
              ) : null}

              {activeSection === 'security' ? (
                <>
                  <section className="sub-panel">
                    <div className="sub-panel-header">
                      <h4>Sign-in persistence</h4>
                      <span className="soft-pill">Current device</span>
                    </div>

                    <div className="settings-toggle-grid">
                      <label className="settings-toggle-card">
                        <div>
                          <strong>Remember me on this device</strong>
                          <p>Keep your session in local storage so you stay signed in between visits.</p>
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
                          autoComplete="new-password"
                          className="input"
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                        />
                      </label>

                      <label className="field">
                        <span>Confirm password</span>
                        <input
                          autoComplete="new-password"
                          className="input"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                        />
                      </label>
                    </div>
                  </section>
                </>
              ) : null}
            </div>

            <div className="panel-footer">
              <p className="muted-copy">{message}</p>
              <div className="button-row">
                <button className="button button-secondary" onClick={handleResetDevicePreferences} type="button">
                  Reset device defaults
                </button>
                <button className="button" disabled={isSaving} type="submit">
                  {isSaving ? 'Saving...' : 'Save settings'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside className="workspace-sidebar section-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Desktop app</h3>
                <p className="muted-copy">Update checks and install status for the packaged desktop build.</p>
              </div>
            </div>

            <div className="panel-body stack gap-16">
              <StatCard label="Runtime" value={desktopInfo.isDesktop ? desktopInfo.platform : 'Web'} />
              <StatCard label="Version" value={desktopInfo.version} />
              <StatCard label="Update status" value={desktopStatus.state} hint={desktopStatus.message} />

              <p className="muted-copy">{desktopStatus.message}</p>

              <div className="button-row">
                <button
                  className="button button-secondary"
                  disabled={isCheckingUpdates || !desktopInfo.canCheckForUpdates}
                  onClick={handleDesktopUpdateCheck}
                  type="button"
                >
                  {isCheckingUpdates ? 'Checking...' : 'Check for updates'}
                </button>

                {desktopStatus.state === 'downloaded' ? (
                  <button className="button" onClick={handleInstallDesktopUpdate} type="button">
                    Install update
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Readiness</h3>
                <p className="muted-copy">A quick pulse-check before you put the workspace in front of clients.</p>
              </div>
            </div>

            <div className="panel-body stack gap-16">
              <div className="settings-profile-meta">
                <div>
                  <span>Identity</span>
                  <strong>{profileCompleteness >= 3 ? 'Ready' : 'Needs attention'}</strong>
                </div>
                <div>
                  <span>Persistence</span>
                  <strong>{rememberMe ? 'Remembered' : 'Session only'}</strong>
                </div>
                <div>
                  <span>Theme</span>
                  <strong>{currentTheme.label}</strong>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
