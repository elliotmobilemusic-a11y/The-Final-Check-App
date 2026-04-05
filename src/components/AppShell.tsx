import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { supabase } from '../lib/supabase';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', caption: 'Overview and priorities' },
  { to: '/clients', label: 'Clients', caption: 'CRM and accounts' },
  { to: '/audit', label: 'Audit Tool', caption: 'Operational audits' },
  { to: '/menu', label: 'Menu Builder', caption: 'Commercial menus' }
];

const routeMeta = [
  {
    match: (pathname: string) => pathname === '/dashboard',
    eyebrow: 'Overview',
    title: 'Portfolio overview',
    description: 'Track the live client book, current delivery work, and the items that need action next.',
    focus: 'Review active accounts, recent updates, and the next priority task.'
  },
  {
    match: (pathname: string) => pathname === '/clients',
    eyebrow: 'Clients',
    title: 'Client list and account setup',
    description: 'Create, review, and organise the businesses behind every audit, menu review, and invoice.',
    focus: 'Keep the client list clean, searchable, and ready for delivery, billing, and follow-up.'
  },
  {
    match: (pathname: string) => pathname.startsWith('/clients/'),
    eyebrow: 'Client profile',
    title: 'Relationship, workstreams, and follow-up',
    description: 'Keep the account view, supporting context, and linked delivery work in one place.',
    focus: 'Use this profile as the single source of truth for the account, actions, and commercial history.'
  },
  {
    match: (pathname: string) => pathname === '/audit',
    eyebrow: 'Audit',
    title: 'Kitchen performance audit',
    description: 'Capture operational findings, commercial pressure points, and a clear action plan.',
    focus: 'Move from evidence capture to a report that is detailed, practical, and ready to present.'
  },
  {
    match: (pathname: string) => pathname === '/menu',
    eyebrow: 'Menu builder',
    title: 'Menu engineering and commercial review',
    description: 'Work through dish costing, pricing, GP, and mix with a stronger operating view.',
    focus: 'Turn pricing, mix, and margin analysis into a menu plan the client can act on.'
  },
  {
    match: (pathname: string) => pathname === '/settings',
    eyebrow: 'Settings',
    title: 'Account, themes, and device preferences',
    description:
      'Personalise the app, control startup behaviour, and manage how it feels on this device.',
    focus: 'Set up the app so it opens the right way and feels consistent every time you use it.'
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
      <div className="app-shell-frame">
        <header className="shell-topbar">
          <div className="shell-toolbar">
            <NavLink className="brand-link" to="/dashboard">
              <span className="brand-icon-shell">
                <img
                  src="/the-final-check-favicon.png"
                  alt="The Final Check logo"
                  className="brand-icon-image"
                />
              </span>
              <span className="brand-copy">
                <span className="brand-kicker">Consultancy platform</span>
                <strong>The Final Check</strong>
                <span className="brand-subtitle">Profit and performance consultancy</span>
              </span>
            </NavLink>

            <div className="shell-toolbar-main">
              <nav className="shell-primary-nav" aria-label="Primary navigation">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to !== '/clients'}
                    className={({ isActive }) => `shell-primary-link ${isActive ? 'active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="shell-toolbar-actions">
              <Link className="user-chip shell-profile-link" to="/settings">
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
                  <small>Profile and settings</small>
                </span>
              </Link>

              <button className="button button-secondary shell-signout" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>

          <div className="shell-pagebar">
            <div className="shell-pagebar-copy">
              <span className="shell-section-label">{meta.eyebrow}</span>
              <div className="shell-pagebar-title-row">
                <h1>{meta.title}</h1>
                <span className="shell-inline-focus">{meta.focus}</span>
              </div>
              <p>{meta.description}</p>
            </div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
