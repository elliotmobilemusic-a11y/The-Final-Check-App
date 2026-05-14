import React, { useState, useRef, useEffect } from 'react';
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
  { to: '/dashboard', label: 'Command Centre', icon: 'dashboard', group: 'Operate' },
  { to: '/clients', label: 'Clients', icon: 'clients', group: 'Operate' },
  { to: '/audit-hub', label: 'Profit Audit', icon: 'audit', group: 'Audits' },
  { to: '/food-safety-hub', label: 'Food Safety', icon: 'shield', group: 'Audits' },
  { to: '/mystery-shop-hub', label: 'Mystery Shop', icon: 'eye', group: 'Audits' },
  { to: '/menu-hub', label: 'Menu Profit Engine', icon: 'calculator', group: 'Profit tools' },
  { to: '/questionnaires', label: 'Pre-Visit Forms', icon: 'forms', group: 'Profit tools' }
];

const visitModeItems = [
  { to: '/audit?visit=1', label: 'Profit Visit', icon: 'trending' },
  { to: '/food-safety?visit=1', label: 'Safety Visit', icon: 'shield' },
  { to: '/mystery-shop?visit=1', label: 'Mystery Visit', icon: 'eye' }
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
    match: '/menu-hub',
    label: 'Menu Profit Engine workspace',
    detail: 'Choose a client, continue a recent project, or start fresh from a pre-visit questionnaire.'
  },
  {
    match: '/menu',
    label: 'Menu Profit Engine',
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

const navGroups = navItems.reduce<Record<string, typeof navItems>>((groups, item) => {
  groups[item.group] = [...(groups[item.group] ?? []), item];
  return groups;
}, {});

function NavIcon({ id, size = 16 }: { id: string; size?: number }) {
  const s = size;
  const icons: Record<string, React.ReactElement> = {
    dashboard: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
    clients: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="8" cy="7" r="3"/><path d="M2 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2"/>
        <circle cx="17" cy="8" r="2.5"/><path d="M22 21v-1.5a4 4 0 0 0-3-3.87"/>
      </svg>
    ),
    audit: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/><polyline points="8 16 10 18 16 12"/>
      </svg>
    ),
    shield: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
    eye: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    calculator: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/>
        <line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/>
        <line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/>
      </svg>
    ),
    forms: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
      </svg>
    ),
    trending: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    cog: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    logout: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
    bell: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  };
  return icons[id] ?? null;
}

export function AppShell() {
  const location = useLocation();
  const { session } = useAuth();
  const { preferences } = usePreferences();
  const { activity } = useActivityOverlay();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navExpanded, setNavExpanded] = useState(true);
  const [navHeight, setNavHeight] = useState(72);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [enquiryAlerts, setEnquiryAlerts] = useState<EnquiryAlert[]>([]);
  const [unreadEnquiryCount, setUnreadEnquiryCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const sidebarProfileRef = useRef<HTMLDivElement>(null);
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
      const inTopbar = profileMenuRef.current?.contains(e.target as Node) ?? false;
      const inSidebar = sidebarProfileRef.current?.contains(e.target as Node) ?? false;
      if (!inTopbar && !inSidebar) {
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
      <div className={`app-shell-frame${sidebarCollapsed ? ' sidebar-is-collapsed' : ''}`}>
        <aside className="shell-sidebar" aria-label="Workspace navigation">
          <button
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="shell-sidebar-toggle"
            onClick={() => setSidebarCollapsed(c => !c)}
            type="button"
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
          <NavLink className="shell-sidebar-brand" to="/dashboard">
            <img
              alt="The Final Check"
              className="shell-brand-logo"
              src="/the-final-check-icon-master-1024.png"
            />
            <span className="shell-brand-copy">
              <strong>The Final Check</strong>
            </span>
          </NavLink>

          <div className="shell-sidebar-scroll">
            {Object.entries(navGroups).map(([group, items]) => (
              <div className="shell-nav-group" key={group}>
                <span className="shell-nav-group-label">{group}</span>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to !== '/clients'}
                    className={({ isActive }) => `shell-sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="shell-nav-icon"><NavIcon id={item.icon} /></span>
                    <span className="shell-nav-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}

            <div className="shell-nav-group shell-nav-group-visit">
              <span className="shell-nav-group-label">Visit mode</span>
              {visitModeItems.map((item) => (
                <NavLink key={item.to} to={item.to} className="shell-sidebar-link shell-sidebar-link-visit">
                  <span className="shell-nav-icon"><NavIcon id={item.icon} /></span>
                  <span className="shell-nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          <div className="shell-sidebar-footer">
            <div className="shell-notification-wrap">
              <button
                aria-expanded={notificationPanelOpen}
                className={`shell-sidebar-link${unreadEnquiryCount > 0 ? ' has-unread' : ''}`}
                onClick={() => setNotificationPanelOpen((current) => !current)}
                type="button"
              >
                <span className="shell-nav-icon"><NavIcon id="bell" /></span>
                <span className="shell-nav-label">
                  Alerts
                  {unreadEnquiryCount > 0 ? (
                    <span className="shell-notification-badge">{unreadEnquiryCount}</span>
                  ) : null}
                </span>
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

            <div className="shell-profile-wrap" ref={sidebarProfileRef}>
              <button
                aria-expanded={profileMenuOpen}
                className="shell-sidebar-link shell-sidebar-profile-btn shell-profile-trigger"
                onClick={() => setProfileMenuOpen((p) => !p)}
                type="button"
              >
                <span className="shell-nav-icon shell-nav-icon-avatar">
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
                </span>
                <span className="shell-nav-label">{displayName}</span>
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
        </aside>

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
                     <span className="shell-nav-icon shell-nav-icon-compact"><NavIcon id={item.icon} /></span>
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
                   <span className="shell-nav-icon shell-nav-icon-mini"><NavIcon id={item.icon} /></span>
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
              : 'padding-top 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), margin-left 0.25s ease'
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
