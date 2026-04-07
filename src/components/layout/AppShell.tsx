import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { supabase } from '../../lib/supabase';
import { hasDesktopApi } from '../../lib/desktop';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    description: 'Portfolio, activity, and command view',
    exact: true
  },
  {
    to: '/clients',
    label: 'Clients',
    description: 'Accounts, contacts, sites, and planning',
    exact: false
  },
  {
    to: '/audit',
    label: 'Audit Tool',
    description: 'Operational reviews and action planning',
    exact: true
  },
  {
    to: '/menu',
    label: 'Menu Builder',
    description: 'Pricing, GP control, and engineering',
    exact: true
  },
  {
    to: '/settings/profile',
    label: 'Settings',
    description: 'Profile, themes, workflow, and device',
    exact: false
  }
];

const workspaceDetails = [
  {
    match: '/dashboard',
    label: 'Portfolio overview',
    detail: 'Track client coverage, recent delivery work, and the next priority action.'
  },
  {
    match: '/clients',
    label: 'CRM workspace',
    detail: 'Manage accounts, contacts, sites, commercial detail, and follow-up.'
  },
  {
    match: '/audit',
    label: 'Audit workspace',
    detail: 'Capture findings, structure evidence, and build a client-ready report.'
  },
  {
    match: '/menu',
    label: 'Menu workspace',
    detail: 'Review dish performance, pricing, and engineering decisions in one flow.'
  },
  {
    match: '/settings',
    label: 'System settings',
    detail: 'Control profile, themes, device defaults, and working preferences.'
  }
];

function deriveDisplayName(email?: string | null) {
  if (!email) return 'Approved user';
  return email.split('@')[0].replace(/[._-]+/g, ' ');
}

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'TF';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { preferences } = usePreferences();
  const displayName =
    preferences.displayName ||
    (typeof session?.user.user_metadata?.display_name === 'string'
      ? session.user.user_metadata.display_name
      : '') ||
    deriveDisplayName(session?.user.email);
  const avatarUrl =
    preferences.avatarUrl ||
    (typeof session?.user.user_metadata?.avatar_url === 'string'
      ? session.user.user_metadata.avatar_url
      : '');
  const activeWorkspace =
    workspaceDetails.find((item) => location.pathname.startsWith(item.match)) ??
    workspaceDetails[0];
  const isDesktop = hasDesktopApi();

  async function handleSignOut() {
    await supabase?.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <div className="desktop-shell">
        <aside className="desktop-sidebar">
          <div className="desktop-sidebar-top">
            <NavLink className="brand-link desktop-brand-link" to="/dashboard">
              <span className="desktop-brand-mark">
                <span className="brand-icon-shell desktop-brand-icon-shell">
                  <img
                    src="/the-final-check-logo.png"
                    alt="The Final Check logo"
                    className="brand-icon-image"
                  />
                </span>
              </span>
              <span className="brand-copy desktop-brand-copy">
                <span className="brand-kicker">
                  {isDesktop ? 'Desktop operating system' : 'Connected operating system'}
                </span>
                <img
                  src="/the-final-check-wordmark.png"
                  alt="The Final Check"
                  className="desktop-brand-wordmark"
                />
                <span className="brand-subtitle">Profit and performance consultancy</span>
              </span>
            </NavLink>

            <div className="desktop-surface desktop-status-card">
              <span className="shell-section-label">{activeWorkspace.label}</span>
              <strong>{activeWorkspace.detail}</strong>
              <p>
                Move between CRM, audit delivery, menu analysis, and account settings from one
                unified workspace.
              </p>
              <div className="desktop-status-grid">
                <div className="desktop-status-metric">
                  <span>Runtime</span>
                  <strong>{isDesktop ? 'Desktop app' : 'Web app'}</strong>
                </div>
                <div className="desktop-status-metric">
                  <span>Workspace</span>
                  <strong>{preferences.compactMode ? 'Compact' : 'Comfortable'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="desktop-sidebar-section">
            <span className="shell-section-label">Navigation</span>
            <nav className="desktop-nav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
                >
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </div>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="desktop-sidebar-section">
            <span className="shell-section-label">Quick launch</span>
            <div className="desktop-quick-grid">
              <Link className="desktop-quick-link" to="/clients/new">
                <strong>New client</strong>
                <span>Start a fresh account record</span>
              </Link>
              <Link className="desktop-quick-link" to="/audit">
                <strong>New audit</strong>
                <span>Open the operational review workspace</span>
              </Link>
              <Link className="desktop-quick-link" to="/menu">
                <strong>New menu</strong>
                <span>Launch a pricing and GP review</span>
              </Link>
            </div>
          </div>

          <div className="desktop-sidebar-footer desktop-surface">
            <Link className="user-chip shell-profile-link desktop-profile-link" to="/settings/profile">
              {avatarUrl ? (
                <img
                  alt={`${displayName} avatar`}
                  className="user-chip-avatar"
                  src={avatarUrl}
                />
              ) : (
                <span className="user-chip-avatar user-chip-avatar-fallback">
                  {getInitials(displayName)}
                </span>
              )}
              <span className="user-chip-copy">
                <strong>{displayName}</strong>
                <small>{isDesktop ? 'Desktop profile and app settings' : 'Profile and app settings'}</small>
              </span>
            </Link>

            <div className="desktop-sidebar-meta">
              <span>{preferences.theme}</span>
              <strong>{preferences.compactMode ? 'Compact workspace' : 'Comfortable workspace'}</strong>
            </div>

            <button className="button button-secondary shell-signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </aside>

        <div className="desktop-main">
          <header className="desktop-topbar desktop-surface">
            <div className="desktop-topbar-copy">
              <span className="shell-section-label">Current workspace</span>
              <strong>{activeWorkspace.label}</strong>
              <p>{activeWorkspace.detail}</p>
            </div>

            <div className="desktop-topbar-actions">
              <Link className="button button-secondary" to="/dashboard">
                Dashboard
              </Link>
              <Link className="button button-ghost" to="/clients/new">
                New client
              </Link>
              <Link className="button button-ghost" to="/settings/profile">
                Settings
              </Link>
              <span className="desktop-runtime-badge">
                {isDesktop ? 'Desktop mode' : 'Web mode'}
              </span>
            </div>
          </header>

          <div className="app-shell-frame">
            <main className="app-content">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
