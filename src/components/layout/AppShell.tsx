import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { supabase } from '../../lib/supabase';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/audit', label: 'Audit Tool' },
  { to: '/food-safety', label: 'Food Safety' },
  { to: '/mystery-shop', label: 'Mystery Shop' },
  { to: '/menu', label: 'Menu Builder' }
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
    match: '/food-safety',
    label: 'Food safety workspace',
    detail: 'Run site compliance checks, temperature logging, and immediate action follow-up.'
  },
  {
    match: '/mystery-shop',
    label: 'Mystery shop workspace',
    detail: 'Score the guest journey, capture service moments, and build a clean follow-up review.'
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
               <span className="brand-copy brand-copy-textonly">
                 <span className="brand-kicker">Consultancy operating system</span>
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
               <div className="shell-context-line">
                 <span className="shell-section-label">{activeWorkspace.label}</span>
                 <span className="shell-context-copy">{activeWorkspace.detail}</span>
               </div>
             </div>

             <div className="shell-toolbar-actions">
               <Link className="user-chip shell-profile-link" to="/settings/profile">
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
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
