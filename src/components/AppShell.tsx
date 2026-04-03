import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { supabase } from '../lib/supabase';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/audit', label: 'Audit Tool' },
  { to: '/menu', label: 'Menu Builder' },
  { to: '/settings', label: 'Settings' }
];

const routeMeta = [
  {
    match: (pathname: string) => pathname === '/dashboard',
    eyebrow: 'Overview',
    title: 'Portfolio command centre',
    description: 'Track the full consultancy system, recent activity, and the next actions that matter.'
  },
  {
    match: (pathname: string) => pathname === '/clients',
    eyebrow: 'Clients',
    title: 'Client portfolio and setup',
    description: 'Create, review, and organise the businesses that sit behind every audit and menu engagement.'
  },
  {
    match: (pathname: string) => pathname.startsWith('/clients/'),
    eyebrow: 'Client profile',
    title: 'Relationship, workstreams, and follow-up',
    description: 'Keep the account view, supporting context, and linked delivery work in one place.'
  },
  {
    match: (pathname: string) => pathname === '/audit',
    eyebrow: 'Audit',
    title: 'Kitchen performance audit workspace',
    description: 'Capture operational findings, commercial pressure points, and the final action plan.'
  },
  {
    match: (pathname: string) => pathname === '/menu',
    eyebrow: 'Menu builder',
    title: 'Menu engineering and commercial review',
    description: 'Work through dish costing, pricing, GP, and mix with a stronger operating view.'
  },
  {
    match: (pathname: string) => pathname === '/settings',
    eyebrow: 'Settings',
    title: 'Account, themes, and device preferences',
    description:
      'Personalise the workspace, control startup behaviour, and manage how the app feels on this device.'
  }
];

const shellQuickLinks = [
  { to: '/clients', label: 'Open clients' },
  { to: '/audit', label: 'New audit' },
  { to: '/menu', label: 'New menu review' },
  { to: '/settings', label: 'Settings' }
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
      <header className="app-topbar">
        <div className="topbar-inner">
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

          <nav className="topbar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-actions">
            <div className="user-chip">
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
            <button className="button button-secondary" onClick={handleSignOut}>
              Sign out
            </button>
          </div>

          <div className="topbar-context">
            <div className="topbar-context-copy">
              <span className="topbar-context-kicker">{meta.eyebrow}</span>
              <strong>{meta.title}</strong>
              <p>{meta.description}</p>
            </div>

            <div className="topbar-context-actions">
              {shellQuickLinks.map((item) => (
                <Link className="button button-ghost" key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
