import { useState, useRef, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { resetSupabaseAuthState } from '../../lib/authStorage';
import { supabase } from '../../lib/supabase';
import { sendEnquiryDeviceNotification } from '../../services/deviceNotifications';
import {
  getEnquiryAlertPreference,
  getEnquiryAlertSnapshot,
  markAllEnquiryAlertsRead,
  markEnquiryAlertRead,
  scanForNewEnquiryAlerts,
  type EnquiryAlert
} from '../../services/enquiryAlerts';
import { disablePushNotifications } from '../../services/pushNotifications';
import { CookingLoader } from './CookingLoader';

const navItems = [
  { to: '/dashboard', label: 'Command Centre' },
  { to: '/clients', label: 'Clients' },
  { to: '/audit-hub', label: 'Profit Audit' },
  { to: '/food-safety-hub', label: 'Food Safety' },
  { to: '/mystery-shop-hub', label: 'Mystery Shop' },
  { to: '/menu', label: 'Menu Profit Engine' },
  { to: '/questionnaires', label: 'Pre-Visit Forms' }
];

const visitModeItems = [
  { to: '/audit?visit=1', label: 'Profit Visit' },
  { to: '/food-safety?visit=1', label: 'Safety Visit' },
  { to: '/mystery-shop?visit=1', label: 'Mystery Visit' }
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
    match: '/audit-hub',
    label: 'Profit Audit workspace',
    detail: 'Choose a client, continue a recent audit, or start fresh from a pre-visit questionnaire.'
  },
  {
    match: '/audit',
    label: 'Kitchen Profit Audit',
    detail: 'Quantify hidden profit, structure findings, and build a premium client-ready report.'
  },
  {
    match: '/food-safety-hub',
    label: 'Food Safety workspace',
    detail: 'Choose a client, continue a recent audit, or start fresh from a pre-visit questionnaire.'
  },
  {
    match: '/food-safety',
    label: 'Food Safety Audit',
    detail: 'Run site compliance checks, temperature logging, and immediate action follow-up.'
  },
  {
    match: '/mystery-shop-hub',
    label: 'Mystery Shop workspace',
    detail: 'Choose a client, continue a recent audit, or start fresh from a pre-visit questionnaire.'
  },
  {
    match: '/mystery-shop',
    label: 'Mystery Shop Audit',
    detail: 'Score the guest journey, capture service moments, and build a clean follow-up review.'
  },
  {
    match: '/menu',
    label: 'Menu Profit Engine workspace',
    detail: 'Track dish margin, weekly contribution, and pricing opportunities in one flow.'
  },
  {
    match: '/questionnaires',
    label: 'Pre-Visit Forms workspace',
    detail: 'Generate pre-visit questionnaire links, review client answers, and prefill audits.'
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
  const [navHeight, setNavHeight] = useState(72);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [enquiryAlerts, setEnquiryAlerts] = useState<EnquiryAlert[]>([]);
  const [unreadEnquiryCount, setUnreadEnquiryCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const disableAutoHideNav = location.pathname.startsWith('/settings') || isNativeAndroid;

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
    if (session?.access_token) {
      try {
        await disablePushNotifications(session.access_token);
      } catch {
        // Ignore device notification cleanup failures during sign-out.
      }
    }

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

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setEnquiryAlerts([]);
      setUnreadEnquiryCount(0);
      return;
    }

    let cancelled = false;

    const applySnapshot = () => {
      const snapshot = getEnquiryAlertSnapshot(userId);
      if (cancelled) return;
      setEnquiryAlerts(snapshot.alerts);
      setUnreadEnquiryCount(snapshot.unreadCount);
    };

    const runScan = async () => {
      try {
        const next = await scanForNewEnquiryAlerts(userId);
        if (cancelled) return;

        setEnquiryAlerts(next.alerts);
        setUnreadEnquiryCount(next.unreadCount);

        if (next.newAlerts.length > 0 && getEnquiryAlertPreference(userId)) {
          await sendEnquiryDeviceNotification(next.newAlerts);
        }
      } catch {
        applySnapshot();
      }
    };

    applySnapshot();
    void runScan();

    const intervalId = window.setInterval(() => {
      void runScan();
    }, 45000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void runScan();
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileMenuOpen]);

  function handleMarkAllEnquiriesRead() {
    if (!session?.user.id) return;
    const snapshot = markAllEnquiryAlertsRead(session.user.id);
    setEnquiryAlerts(snapshot.alerts);
    setUnreadEnquiryCount(snapshot.unreadCount);
  }

  function handleOpenEnquiry(alertId: string) {
    if (!session?.user.id) return;
    const snapshot = markEnquiryAlertRead(session.user.id, alertId);
    setEnquiryAlerts(snapshot.alerts);
    setUnreadEnquiryCount(snapshot.unreadCount);
    setNotificationPanelOpen(false);
  }

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
               <nav className="shell-secondary-nav" aria-label="Visit mode launches">
                 <span className="shell-secondary-label">Visit mode</span>
                 {visitModeItems.map((item) => (
                   <NavLink
                     key={item.to}
                     to={item.to}
                     className="shell-secondary-link"
                   >
                     <span className="nav-link-inner">{item.label}</span>
                   </NavLink>
                 ))}
               </nav>
             </div>

             <div className="shell-toolbar-actions">
               <div className="shell-notification-wrap">
                 <button
                   aria-expanded={notificationPanelOpen}
                   className={`button button-secondary shell-notification-trigger ${unreadEnquiryCount > 0 ? 'has-unread' : ''}`}
                   onClick={() => setNotificationPanelOpen((current) => !current)}
                   type="button"
                 >
                   Alerts
                   {unreadEnquiryCount > 0 ? (
                     <span className="shell-notification-badge">{unreadEnquiryCount}</span>
                   ) : null}
                 </button>

                 {notificationPanelOpen ? (
                   <div className="shell-notification-panel">
                     <div className="shell-notification-panel-top">
                       <div>
                         <strong>New enquiries</strong>
                         <small>{unreadEnquiryCount > 0 ? `${unreadEnquiryCount} unread` : 'All caught up'}</small>
                       </div>
                       <button className="button button-ghost" onClick={handleMarkAllEnquiriesRead} type="button">
                         Mark all read
                       </button>
                     </div>

                     {!enquiryAlerts.length ? (
                       <div className="shell-notification-empty">No new enquiries yet.</div>
                     ) : (
                       <div className="shell-notification-list">
                         {enquiryAlerts.map((alert) => (
                           <Link
                             className={`shell-notification-item ${alert.readAt ? '' : 'unread'}`}
                             key={alert.id}
                             onClick={() => handleOpenEnquiry(alert.id)}
                             to={`/clients/${alert.clientId}`}
                           >
                             <strong>{alert.companyName}</strong>
                             <span>{alert.contactName || 'New client enquiry'}</span>
                             <small>{alert.location || 'Location not set'}</small>
                           </Link>
                         ))}
                       </div>
                     )}
                   </div>
                 ) : null}
               </div>

               <div className="shell-profile-wrap" ref={profileMenuRef}>
                 <button
                   aria-expanded={profileMenuOpen}
                   className="user-chip shell-profile-trigger"
                   onClick={() => setProfileMenuOpen((p) => !p)}
                   type="button"
                 >
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
                   </span>
                   <span aria-hidden="true" className="shell-profile-chevron">▾</span>
                 </button>
                 {profileMenuOpen && (
                   <div className="shell-profile-menu">
                     <Link
                       className="shell-profile-menu-item"
                       onClick={() => setProfileMenuOpen(false)}
                       to="/settings/profile"
                     >
                       Profile &amp; settings
                     </Link>
                     <button
                       className="shell-profile-menu-item shell-profile-menu-signout"
                       onClick={() => { setProfileMenuOpen(false); void handleSignOut(); }}
                       type="button"
                     >
                       Sign out
                     </button>
                   </div>
                 )}
               </div>
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
