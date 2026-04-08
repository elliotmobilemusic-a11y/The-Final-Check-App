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

type SettingsSection = 'profile' | 'appearance' | 'workflow' | 'security';

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
  return (
    value === 'profile' ||
    value === 'appearance' ||
    value === 'security'
  );
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarPosition, setAvatarPosition] = useState({ x: 50, y: 50, scale: 1 });
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);

  useEffect(() => {
    setDisplayName(preferences.displayName);
    setAvatarUrl(preferences.avatarUrl);
    setTheme(preferences.theme);
    setDefaultLandingPage(preferences.defaultLandingPage);
    setCompactMode(preferences.compactMode);
    setReducedMotion(preferences.reducedMotion);
    setAutoShowNav(preferences.autoShowNav);
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
    () =>
      displayName.trim() ||
      preferences.displayName ||
      deriveDisplayName(session?.user.email),
    [displayName, preferences.displayName, session?.user.email]
  );
  
  const currentAvatarSrc = avatarPreview || avatarUrl.trim() || preferences.avatarUrl;
  const currentTheme = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const activeSectionMeta =
    settingsSections.find((item) => item.value === activeSection) ?? settingsSections[0];

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

      // Save preview image if uploaded, otherwise use manual URL
      const finalAvatarUrl = avatarPreview || avatarUrl.trim();

      if (supabase && session) {
        const { data, error } = await supabase.auth.updateUser({
          data: {
            display_name: displayName.trim(),
            avatar_url: finalAvatarUrl,
            avatar_position: avatarPosition
          },
          ...(newPassword ? { password: newPassword } : {})
        });

        if (error) throw error;

        // Force refresh session with new metadata so navigation updates immediately
        await supabase.auth.refreshSession();
      }

      // Clear local preview state after successful save
      setAvatarFile(null);
      setAvatarPreview('');
      setIsAvatarEditorOpen(false);

      // Explicitly update preferences with saved values
      updatePreferences({
        displayName: displayName.trim(),
        avatarUrl: finalAvatarUrl,
        avatarPosition,
        theme,
        defaultLandingPage,
        compactMode,
        reducedMotion,
        autoShowNav
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setAvatarPreview(ev.target?.result as string);
                        setIsAvatarEditorOpen(true);
                      };
                      reader.readAsDataURL(file);
                    }
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
                <p className="muted-copy">
                  {activeSectionMeta.description}
                </p>
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
                    <input
                      className="input"
                      disabled
                      value={session?.user.email ?? ''}
                    />
                  </label>

                  <label className="field">
                    <span>Job title</span>
                    <input
                      className="input"
                      placeholder="e.g. Auditor, Manager"
                      value={preferences.jobTitle || ''}
                      onChange={(event) => updatePreferences({ jobTitle: event.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Organisation</span>
                    <input
                      className="input"
                      placeholder="Company name"
                      value={preferences.organisation || ''}
                      onChange={(event) => updatePreferences({ organisation: event.target.value })}
                    />
                  </label>
                </div>
              </section>
              ) : null}

              {activeSection === 'appearance' ? (
              <section className="sub-panel">
                <div className="sub-panel-header">
                  <h4>Theme and appearance</h4>
                  <span className="soft-pill">Live preview enabled</span>
                </div>

                <div className="sub-panel-header">
                  <h4>Visual themes</h4>
                  <span className="soft-pill">Live preview</span>
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
                        <div className={`settings-theme-preview ${preview?.accentClass ?? ''}`}>
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

                <div className="sub-panel-header">
                  <h4>Behaviour and accessibility</h4>
                  <span className="soft-pill">Accessibility</span>
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

                   <label className="settings-toggle-card">
                     <div>
                       <strong>Auto show navigation</strong>
                       <p>Navigation bar slides down automatically when moving the mouse near the top edge of the screen.</p>
                     </div>
                     <input
                       checked={autoShowNav}
                       type="checkbox"
                       onChange={(event) => setAutoShowNav(event.target.checked)}
                       disabled={reducedMotion}
                     />
                   </label>
                </div>

              </section>
              ) : null}


              {activeSection === 'security' ? (
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
              ) : null}

              <div className="settings-save-bar fixed-bottom-right">
                <span className="soft-pill">{message}</span>
                <button className="button button-secondary" onClick={handleResetDevicePreferences} type="button">
                  Reset
                </button>
                <button className="button button-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
