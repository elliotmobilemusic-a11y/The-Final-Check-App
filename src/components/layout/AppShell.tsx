import { useState, useRef, useEffect } from 'react';
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
  const [navExpanded, setNavExpanded] = useState(true);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!preferences.autoShowNav || preferences.reducedMotion) {
      setNavExpanded(true);
      return;
    }

    let lastScrollY = window.scrollY;
    let hideTimeout: ReturnType<typeof setTimeout>;

    const scheduleHide = () => {
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        setNavExpanded(false);
      }, 2200);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 50) {
        setNavExpanded(true);
        scheduleHide();
      }
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY) {
        // Scrolling up - show nav
        setNavExpanded(true);
        scheduleHide();
      } else if (currentScrollY > lastScrollY && currentScrollY > 24) {
        // Scrolling down - hide nav immediately with zero threshold
        clearTimeout(hideTimeout);
        setNavExpanded(false);
      }
      
      lastScrollY = currentScrollY;
    };

    const handleMouseEnter = () => {
      clearTimeout(hideTimeout);
    };

    const handleMouseLeave = () => {
      scheduleHide();
    };

    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    if (navRef.current) {
      navRef.current.addEventListener('mouseenter', handleMouseEnter);
      navRef.current.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(hideTimeout);
      if (navRef.current) {
        navRef.current.removeEventListener('mouseenter', handleMouseEnter);
        navRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [preferences.autoShowNav, preferences.reducedMotion]);
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
  const avatarPosition = preferences.avatarPosition || { x: 50, y: 50, scale: 1 };
  const activeWorkspace =
    workspaceDetails.find((item) => location.pathname.startsWith(item.match)) ??
    workspaceDetails[0];

  async function handleSignOut() {
    // Clear everything first immediately
    window.localStorage.clear();
    
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // Ignore sign out errors - we are leaving anyway
      }
    }
    
    // Hard redirect immediately - don't wait for anything
    window.location.href = '/';
  }

  useEffect(() => {
    document.documentElement.style.setProperty('--nav-offset', navExpanded ? '110px' : '24px');
  }, [navExpanded]);

  return (
    <div className="app-shell">
      <div className="app-shell-frame">
        <header 
          ref={navRef} 
          className={`shell-topbar ${!navExpanded && preferences.autoShowNav && !preferences.reducedMotion ? 'nav-collapsed' : ''}`}
        >
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
                     style={{
                       objectPosition: `${avatarPosition.x}% ${avatarPosition.y}%`,
                       transform: `scale(${avatarPosition.scale})`
                     }}
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

        <main className="app-content" style={{ paddingTop: 'var(--nav-offset)', transition: 'padding-top 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
