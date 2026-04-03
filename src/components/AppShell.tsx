import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { supabase } from '../lib/supabase';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', caption: 'Command centre' },
  { to: '/clients', label: 'Clients', caption: 'CRM and accounts' },
  { to: '/audit', label: 'Audit Tool', caption: 'Site reviews' },
  { to: '/menu', label: 'Menu Builder', caption: 'Commercial menus' },
  { to: '/settings', label: 'Settings', caption: 'Account and themes' }
];

const routeMeta = [
  {
    match: (pathname: string) => pathname === '/dashboard',
    eyebrow: 'Overview',
    title: 'Portfolio command centre',
    description: 'Track the full consultancy system, recent activity, and the next actions that matter.',
    focus: 'Review movement across clients, active delivery, and priority work that needs attention.'
  },
  {
    match: (pathname: string) => pathname === '/clients',
    eyebrow: 'Clients',
    title: 'Client portfolio and setup',
    description: 'Create, review, and organise the businesses that sit behind every audit and menu engagement.',
    focus: 'Keep the list clean, searchable, and ready for delivery, billing, and follow-up.'
  },
  {
    match: (pathname: string) => pathname.startsWith('/clients/'),
    eyebrow: 'Client profile',
    title: 'Relationship, workstreams, and follow-up',
    description: 'Keep the account view, supporting context, and linked delivery work in one place.',
    focus: 'Use the profile as the single source of truth for the account, actions, and commercial history.'
  },
  {
    match: (pathname: string) => pathname === '/audit',
    eyebrow: 'Audit',
    title: 'Kitchen performance audit workspace',
    description: 'Capture operational findings, commercial pressure points, and the final action plan.',
    focus: 'Move from evidence capture to a report that is detailed, commercial, and quick to present.'
  },
  {
    match: (pathname: string) => pathname === '/menu',
    eyebrow: 'Menu builder',
    title: 'Menu engineering and commercial review',
    description: 'Work through dish costing, pricing, GP, and mix with a stronger operating view.',
    focus: 'Turn pricing, mix, and margin analysis into a usable menu action plan.'
  },
  {
    match: (pathname: string) => pathname === '/settings',
    eyebrow: 'Settings',
    title: 'Account, themes, and device preferences',
    description:
      'Personalise the workspace, control startup behaviour, and manage how the app feels on this device.',
    focus: 'Set up the workspace so the app opens the right way and feels consistent every time you use it.'
  }
];

const shellQuickLinks = [
  { to: '/clients', label: 'Open clients', caption: 'Jump into the CRM list' },
  { to: '/audit', label: 'New audit', caption: 'Start a fresh audit workspace' },
  { to: '/menu', label: 'New menu review', caption: 'Open menu engineering' },
  { to: '/settings', label: 'Settings', caption: 'Adjust themes and device options' }
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
  const meta = routeMeta.find((item) => item.match(location.pathname)) ?? routeMeta[0];
  const activeNav =
    navItems.find((item) =>
      item.to === '/clients'
        ? location.pathname === '/clients' || location.pathname.startsWith('/clients/')
        : location.pathname === item.to
    ) ?? navItems[0];
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

  async function handleSignOut() {
    await supabase?.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <div className="app-shell-frame">
        <aside className="shell-sidebar">
          <div className="shell-sidebar-top">
            <NavLink className="brand-link" to="/dashboard">
              <span className="brand-mark">
                <img
                  src="/the-final-check-logo.png"
                  alt="The Final Check logo"
                  className="brand-logo"
                />
              </span>
              <div className="brand-copy">
                <small className="brand-kicker">Consultancy OS</small>
                <strong>The Final Check</strong>
                <span className="brand-subtitle">Profit and Performance Consultancy</span>
              </div>
            </NavLink>

            <div className="shell-sidebar-intro">
              <span className="shell-section-label">Operating system</span>
              <p>
                A cleaner workspace for running clients, audits, menus, billing, and
                account setup without the interface fighting for attention.
              </p>
            </div>
          </div>

          <div className="shell-sidebar-panel">
            <div className="shell-panel-heading">
              <span className="shell-section-label">Navigation</span>
              <strong>{activeNav.label}</strong>
            </div>

            <nav className="shell-nav">
              {navItems.map((item, index) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to !== '/clients'}
                  className={({ isActive }) => `shell-nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="shell-nav-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="shell-nav-copy">
                    <strong>{item.label}</strong>
                    <small>{item.caption}</small>
                  </span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="shell-sidebar-panel shell-sidebar-panel-muted">
            <div className="shell-panel-heading">
              <span className="shell-section-label">Quick actions</span>
              <strong>Most-used moves</strong>
            </div>

            <div className="shell-quick-grid">
              {shellQuickLinks.map((item) => (
                <Link className="shell-quick-link" key={item.to} to={item.to}>
                  <strong>{item.label}</strong>
                  <small>{item.caption}</small>
                </Link>
              ))}
            </div>
          </div>

          <div className="shell-sidebar-footer">
            <div className="user-chip shell-user-card">
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
                <small>{session?.user.email ?? 'Approved user'}</small>
              </span>
            </div>
            <button className="button button-secondary shell-signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </aside>

        <div className="shell-main">
          <header className="shell-header">
            <div className="shell-header-copy">
              <span className="shell-section-label">{meta.eyebrow}</span>
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>

            <div className="shell-header-card">
              <span>Current focus</span>
              <strong>{meta.focus}</strong>
              <small>{activeNav.label} workspace</small>
            </div>
          </header>

          <main className="app-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
