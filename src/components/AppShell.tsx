import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/audit', label: 'Audit Tool' },
  { to: '/menu', label: 'Menu Builder' }
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
  }
];

const shellQuickLinks = [
  { to: '/clients', label: 'Open clients' },
  { to: '/audit', label: 'New audit' },
  { to: '/menu', label: 'New menu review' }
];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const meta = routeMeta.find((item) => item.match(location.pathname)) ?? routeMeta[0];

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
            <div className="user-chip">{session?.user.email ?? 'Approved user'}</div>
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
