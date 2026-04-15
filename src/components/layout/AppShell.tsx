import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { resetSupabaseAuthState } from '../../lib/authStorage';
import { supabase } from '../../lib/supabase';
import { CookingLoader } from './CookingLoader';

const navItems = [
  { to: '/dashboard', label: 'Command Centre' },
  { to: '/clients', label: 'Clients' },
  { to: '/audit', label: 'Profit Audit' },
  { to: '/food-safety', label: 'Food Safety' },
  { to: '/mystery-shop', label: 'Mystery Shop' },
  { to: '/menu', label: 'Menu Profit Engine' }
];

const workspaceDetails = [
  {
    match: '/dashboard',
    label: 'Command centre',
    detail: 'Track active clients, profit opportunity, follow-ups, and the next commercial priority.'
  },
  {
    match: '/clients',
    label: 'CRM workspace',
    detail: 'Manage accounts, contacts, sites, commercial detail, and follow-up.'
  },
  {
    match: '/audit',
    label: 'Kitchen Profit Audit workspace',
    detail: 'Quantify hidden profit, structure findings, and build a premium client-ready report.'
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
    label: 'Menu Profit Engine workspace',
    detail: 'Track dish margin, weekly contribution, and pricing opportunities in one flow.'
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

function normalizeAvatarUrl(value?: string | null) {
  const url = String(value ?? '').trim();
  return /^https?:\/\/.+\/storage\/v1\/object\/public\/avatars\//i.test(url) ? url : '';
}

export function AppShell() {
  const location = useLocation();
  const { session } = useAuth();
  const { preferences } = usePreferences();
  const { activity } = useActivityOverlay();
  const [navExpanded, setNavExpanded] = useState(true);
  const [navHeight, setNavHeight] = useState(108);
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const disableAutoHideNav = location.pathname.startsWith('/settings');

  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const updateNavHeight = () => {
      const nextHeight = Math.ceil(navElement.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setNavHeight(nextHeight);
      }
    };

    updateNavHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateNavHeight);
      return () => window.removeEventListener('resize', updateNavHeight);
    }

    const observer = new ResizeObserver(() => updateNavHeight());
    observer.observe(navElement);
    window.addEventListener('resize', updateNavHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateNavHeight);
    };
  }, []);

  useEffect(() => {
    if (disableAutoHideNav || !preferences.autoShowNav || preferences.reducedMotion) {
      setNavExpanded(true);
      return;
    }

    let ticking = false;

    const syncNavVisibility = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;
      const nearTop = currentScrollY <= 18;
      const revealBand = currentScrollY <= navHeight + 12;

      if (nearTop || revealBand || delta < -10) {
        setNavExpanded(true);
      } else if (delta > 14 && currentScrollY > navHeight + 48) {
        setNavExpanded(false);
      }

      lastScrollY.current = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(syncNavVisibility);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.clientY <= Math.max(72, navHeight * 0.72)) {
        setNavExpanded(true);
      }
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [disableAutoHideNav, navHeight, preferences.autoShowNav, preferences.reducedMotion]);
  const displayName =
    preferences.displayName ||
    (typeof session?.user.user_metadata?.display_name === 'string'
      ? session.user.user_metadata.display_name
      : '') ||
    deriveDisplayName(session?.user.email);
  const avatarUrl =
    normalizeAvatarUrl(preferences.avatarUrl) ||
    (typeof session?.user.user_metadata?.avatar_url === 'string'
      ? normalizeAvatarUrl(session.user.user_metadata.avatar_url)
      : '');
  const avatarPosition = preferences.avatarPosition || { x: 50, y: 50, scale: 1 };
  const activeWorkspace =
    workspaceDetails.find((item) => location.pathname.startsWith(item.match)) ??
    workspaceDetails[0];
  const overlayContent = activity ?? {
    kicker: 'Preparing station',
    title: activeWorkspace.label,
    detail: activeWorkspace.detail
  };

  async function handleSignOut() {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore sign-out errors and continue resetting the local auth state.
      }
    }

    resetSupabaseAuthState();
    window.location.assign('/#/login');
  }

  useEffect(() => {
    // Reset scroll position tracking on page navigation AFTER browser has updated scroll position
    setTimeout(() => {
      lastScrollY.current = window.scrollY;
      // Force nav to show when navigating to new page
      setNavExpanded(true);
    }, 0);
  }, [location.pathname]);

  useEffect(() => {
    const visibleOffset = `${navHeight + 28}px`;
    const collapsedOffset = `${Math.max(28, Math.round(navHeight * 0.34))}px`;
    const peekHeight = `${Math.max(16, Math.round(navHeight * 0.18))}px`;

    document.documentElement.style.setProperty('--nav-height', `${navHeight}px`);
    document.documentElement.style.setProperty('--nav-offset', navExpanded ? visibleOffset : collapsedOffset);
    document.documentElement.style.setProperty('--nav-peek', peekHeight);
  }, [navExpanded, navHeight]);

  return (
    <div className="app-shell">
      <div className="app-shell-frame">
        <header 
          ref={navRef} 
          className={`shell-topbar ${!disableAutoHideNav && !navExpanded && preferences.autoShowNav && !preferences.reducedMotion ? 'nav-collapsed' : ''}`}
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
                     <span className="nav-link-inner">{item.label}</span>
                   </NavLink>
                 ))}
               </nav>
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

        <main
          className="app-content"
          style={{
            paddingTop: 'var(--nav-offset)',
            transition: disableAutoHideNav
              ? 'none'
              : 'padding-top 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <CookingLoader
            detail={overlayContent.detail}
            kicker={overlayContent.kicker}
            reducedMotion={preferences.reducedMotion}
            title={overlayContent.title}
            visible={Boolean(activity)}
          />
          <div
            className={`workspace-transition-shell ${preferences.reducedMotion ? 'reduced-motion' : ''}`}
            key={location.pathname}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
