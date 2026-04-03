import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/audit', label: 'Audit Tool' },
  { to: '/menu', label: 'Menu Builder' }
];

export function AppShell() {
  const navigate = useNavigate();
  const { session } = useAuth();

  async function handleSignOut() {
    await supabase?.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="topbar-inner">
          <NavLink className="brand-link" to="/dashboard">
            <img
              src="/the-final-check-logo.png"
              alt="The Final Check logo"
              className="brand-logo"
            />
            <div className="brand-copy">
              <strong>The Final Check</strong>
              <span>Profit and Performance Consultancy</span>
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
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}