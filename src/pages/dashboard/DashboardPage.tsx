import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import type { ClientRecord } from '../../types';
import { listAudits } from '../../services/audits';
import { listClients } from '../../services/clients';
import { listFoodSafetyAudits } from '../../services/foodSafetyAudits';
import { listMysteryShopAudits } from '../../services/mysteryShopAudits';
import { listMenuProjects } from '../../services/menus';
import { readDraft, writeDraft } from '../../services/draftStore';
import { calculateKitchenProfitMetrics } from '../../features/profit/kitchenProfit';
import { fmtCurrency } from '../../lib/utils';
import { PageContainer } from '../../components/layout';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type AuditRows = Awaited<ReturnType<typeof listAudits>>;
type ClientRows = Awaited<ReturnType<typeof listClients>>;
type MenuRows = Awaited<ReturnType<typeof listMenuProjects>>;
type FoodSafetyRows = Awaited<ReturnType<typeof listFoodSafetyAudits>>;
type MysteryShopRows = Awaited<ReturnType<typeof listMysteryShopAudits>>;

type PortfolioSummary = {
  client: ClientRecord;
  audits: number;
  menus: number;
  openTasks: number;
  sites: number;
  nextReviewDays: number | null;
  totalWorkstreams: number;
};

type RecentWorkItem = {
  id: string;
  type: string;
  title: string;
  date: string;
  to: string;
};

function getTimestamp(value?: string | null) {
  if (!value) return 0;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortNewest<T extends { updated_at?: string | null; created_at?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aTime = getTimestamp(a.updated_at ?? a.created_at);
    const bTime = getTimestamp(b.updated_at ?? b.created_at);
    return bTime - aTime;
  });
}

function daysUntil(value?: string | null) {
  if (!value) return null;

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();

  return Math.round((startTarget - startToday) / (1000 * 60 * 60 * 24));
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function deriveDisplayName(email?: string | null) {
  if (!email) return 'there';
  return email.split('@')[0].replace(/[._-]+/g, ' ');
}

function fmtShortDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const repoBaseUrl = 'https://github.com/elliotmobilemusic-a11y/The-Final-Check-App';
const desktopReleasesUrl = `${repoBaseUrl}/releases`;
const DASHBOARD_TASKS_DRAFT_KEY = 'dashboard-task-groups-v1';

type TaskItem = {
  id: string;
  text: string;
  completed: boolean;
};

type TaskGroup = {
  id: string;
  title: string;
  tasks: TaskItem[];
  collapsed: boolean;
};

const defaultTaskGroups: TaskGroup[] = [
  {
    id: '1',
    title: 'Today',
    collapsed: false,
    tasks: [
      { id: '1', text: 'Create your first client', completed: false },
      { id: '2', text: 'Run first kitchen audit', completed: false },
      { id: '3', text: 'Setup menu builder', completed: false }
    ]
  }
];

function ActionGlyph({ type }: { type: 'clients' | 'shield' | 'document' | 'plus' }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  if (type === 'clients') {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2" />
        <path d="M16 11a3 3 0 0 1 5 2.2V15" />
      </svg>
    );
  }

  if (type === 'shield') {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }

  if (type === 'document') {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    );
  }

  if (type === 'plus') {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  return null;
}

export function DashboardPage() {
  const { session } = useAuth();
  const { preferences } = usePreferences();
  const [clients, setClients] = useState<ClientRows>([]);
  const [audits, setAudits] = useState<AuditRows>([]);
  const [menus, setMenus] = useState<MenuRows>([]);
  const [foodSafetyAudits, setFoodSafetyAudits] = useState<FoodSafetyRows>([]);
  const [mysteryShopAudits, setMysteryShopAudits] = useState<MysteryShopRows>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Portfolio loaded.');
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<'ready' | 'installed' | 'manual'>('manual');

  useEffect(() => {
    async function load() {
      try {
        const [clientRows, auditRows, menuRows, foodSafetyRows, mysteryShopRows] = await Promise.all([
          listClients(),
          listAudits(),
          listMenuProjects(),
          listFoodSafetyAudits(),
          listMysteryShopAudits()
        ]);

        setClients(sortNewest(clientRows));
        setAudits(sortNewest(auditRows));
        setMenus(sortNewest(menuRows));
        setFoodSafetyAudits(foodSafetyRows);
        setMysteryShopAudits(mysteryShopRows);
        setMessage('Data up to date.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron'));

    if (isInstalled) {
      setInstallState('installed');
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setInstallState('ready');
    }

    function handleInstalled() {
      setInstallPromptEvent(null);
      setInstallState('installed');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const portfolio = useMemo<PortfolioSummary[]>(() => {
    const auditCountByClient = new Map<string, number>();
    const menuCountByClient = new Map<string, number>();

    for (const audit of audits) {
      if (!audit.client_id) continue;
      auditCountByClient.set(audit.client_id, (auditCountByClient.get(audit.client_id) ?? 0) + 1);
    }

    for (const menu of menus) {
      if (!menu.client_id) continue;
      menuCountByClient.set(menu.client_id, (menuCountByClient.get(menu.client_id) ?? 0) + 1);
    }

    return sortNewest(clients).map((client) => {
      const data = client.data;
      const auditCount = auditCountByClient.get(client.id) ?? 0;
      const menuCount = menuCountByClient.get(client.id) ?? 0;
      const openTasks = (data?.tasks ?? []).filter((task) => task.status !== 'Done').length;
      const sites = data?.sites.length ?? 0;

      return {
        client,
        audits: auditCount,
        menus: menuCount,
        openTasks,
        sites,
        nextReviewDays: daysUntil(client.next_review_date),
        totalWorkstreams: auditCount + menuCount
      };
    });
  }, [audits, clients, menus]);

  const activeClients = portfolio.filter(
    (item) => (item.client.status ?? 'Active').toLowerCase() !== 'inactive'
  );
  const overdueReviews = portfolio.filter(
    (item) => item.nextReviewDays !== null && item.nextReviewDays < 0
  );
  const dueSoonReviews = portfolio.filter(
    (item) => item.nextReviewDays !== null && item.nextReviewDays >= 0 && item.nextReviewDays <= 14
  );
  const latestAuditByClient = useMemo(() => {
    const map = new Map<string, AuditRows[number]>();
    for (const audit of audits) {
      if (!audit.client_id || map.has(audit.client_id)) continue;
      map.set(audit.client_id, audit);
    }
    return map;
  }, [audits]);
  const totalOpportunityIdentified = useMemo(
    () =>
      Array.from(latestAuditByClient.values()).reduce(
        (sum, audit) => sum + calculateKitchenProfitMetrics(audit.data).totalWeeklyOpportunity,
        0
      ),
    [latestAuditByClient]
  );
  const sitesNeedingAttention = overdueReviews.length + portfolio.filter((item) => {
    const latestAudit = latestAuditByClient.get(item.client.id);
    return latestAudit ? calculateKitchenProfitMetrics(latestAudit.data).totalWeeklyOpportunity > 0 : false;
  }).length;

  const welcomeName =
    preferences.displayName ||
    (typeof session?.user.user_metadata?.display_name === 'string'
      ? session.user.user_metadata.display_name
      : '') ||
    deriveDisplayName(session?.user.email);
  const welcomeLabel = welcomeName.split(/\s+/).filter(Boolean)[0] || welcomeName;

  async function handleInstallApp() {
    if (installPromptEvent) {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallState('installed');
        setInstallPromptEvent(null);
        return;
      }
    }

    window.open(desktopReleasesUrl, '_blank', 'noopener,noreferrer');
  }

  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>(
    () => readDraft<TaskGroup[]>(DASHBOARD_TASKS_DRAFT_KEY, session?.user.id) ?? defaultTaskGroups
  );
  const [groupInputText, setGroupInputText] = useState<Record<string, string>>({});

  useEffect(() => {
    writeDraft(DASHBOARD_TASKS_DRAFT_KEY, taskGroups, session?.user.id);
  }, [session?.user.id, taskGroups]);

  useEffect(() => {
    if (installState === 'ready') {
      setShowInstallPrompt(true);
      return;
    }

    setShowInstallPrompt(false);
  }, [installState]);

  function dismissInstallPrompt() {
    setShowInstallPrompt(false);
  }

  function toggleTaskComplete(groupId: string, taskId: string) {
    setTaskGroups(groups => groups.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        tasks: group.tasks.map(task => {
          if (task.id !== taskId) return task;
          return { ...task, completed: !task.completed };
        })
      };
    }));
  }

  function addTask(groupId: string) {
    const text = (groupInputText[groupId] ?? '').trim();
    if (!text) return;
    setTaskGroups(groups => groups.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        tasks: [...group.tasks, {
          id: Date.now().toString(),
          text,
          completed: false
        }]
      };
    }));
    setGroupInputText(prev => ({ ...prev, [groupId]: '' }));
  }

  function deleteTask(groupId: string, taskId: string) {
    setTaskGroups(groups => groups.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        tasks: group.tasks.filter(task => task.id !== taskId)
      };
    }));
  }

  function toggleGroupCollapse(groupId: string) {
    setTaskGroups(groups => groups.map(group => {
      if (group.id !== groupId) return group;
      return { ...group, collapsed: !group.collapsed };
    }));
  }

  function addNewGroup() {
    setTaskGroups(groups => [...groups, {
      id: Date.now().toString(),
      title: 'New list',
      collapsed: false,
      tasks: []
    }]);
  }

  function deleteGroup(groupId: string) {
    setTaskGroups(groups => groups.filter(group => group.id !== groupId));
  }

  const totalTasks = taskGroups.reduce((sum, group) => sum + group.tasks.length, 0);
  const completedTasks = taskGroups.reduce(
    (sum, group) => sum + group.tasks.filter((task) => task.completed).length,
    0
  );
  const openTasks = totalTasks - completedTasks;

  const recentWork = useMemo<RecentWorkItem[]>(() => {
    return [
      ...audits.map((a) => ({
        id: `audit-${a.id}`,
        type: 'Kitchen Audit',
        title: a.title || a.site_name || 'Kitchen Audit',
        date: a.updated_at ?? a.created_at ?? '',
        to: `/audit?load=${a.id}`
      })),
      ...menus.map((m) => ({
        id: `menu-${m.id}`,
        type: 'Menu Project',
        title: m.title || m.site_name || 'Menu Project',
        date: m.updated_at ?? m.created_at ?? '',
        to: `/menu?load=${m.id}`
      })),
      ...foodSafetyAudits.map((f) => ({
        id: `fs-${f.id}`,
        type: 'Food Safety',
        title: f.title || f.site_name || 'Food Safety Audit',
        date: f.updated_at ?? f.created_at ?? '',
        to: `/food-safety?load=${f.id}`
      })),
      ...mysteryShopAudits.map((ms) => ({
        id: `ms-${ms.id}`,
        type: 'Mystery Shop',
        title: ms.title || ms.site_name || 'Mystery Shop Audit',
        date: ms.updated_at ?? ms.created_at ?? '',
        to: `/mystery-shop?load=${ms.id}`
      }))
    ]
      .filter((item) => !!item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [audits, menus, foodSafetyAudits, mysteryShopAudits]);

  const recentActivity = [
    ...audits.map((audit) => ({
      id: `audit-${audit.id}`,
      title: audit.title || 'Kitchen Audit',
      label: 'Kitchen audit',
      date: audit.updated_at ?? audit.created_at
    })),
    ...menus.map((menu) => ({
      id: `menu-${menu.id}`,
      title: menu.title || 'Menu project',
      label: 'Menu project',
      date: menu.updated_at ?? menu.created_at
    })),
    ...foodSafetyAudits.map((audit) => ({
      id: `fs-${audit.id}`,
      title: audit.title || 'Food Safety Audit',
      label: 'Food safety',
      date: audit.updated_at ?? audit.created_at
    })),
    ...mysteryShopAudits.map((audit) => ({
      id: `ms-${audit.id}`,
      title: audit.title || 'Mystery Shop Audit',
      label: 'Mystery shop',
      date: audit.updated_at ?? audit.created_at
    }))
  ]
    .filter((item) => !!item.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <PageContainer size="wide" className="command-centre-page dashboard-page">
      <div className="page-stack dashboard-stack">

        {showInstallPrompt && installState !== 'installed' && (
          <div className="install-float-prompt">
            <div className="install-float-copy">
              <span>Install desktop app</span>
            </div>
            <div className="install-float-actions">
              <button className="button button-small" onClick={handleInstallApp}>Download</button>
              <button className="button button-small button-ghost" onClick={dismissInstallPrompt}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="command-centre-hero">
          <div className="command-centre-hero-copy">
            <span className="command-centre-eyebrow">Command Centre</span>
            <h1 className="command-centre-title">Welcome, {welcomeLabel}</h1>
            <p className="command-centre-desc">
              Track live clients, profit opportunity, follow-ups due, and which sites need attention next.
            </p>
            <div className="command-centre-status-row">
              {message && <span className="command-centre-status-chip">{message.replace(/\.$/, '')}</span>}
              <span className="command-centre-status-chip command-centre-status-chip-muted">
                {loading ? 'Refreshing portfolio' : 'Updated just now'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="command-centre-kpis">
          <div className="cc-kpi">
            <div className="cc-kpi-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="cc-kpi-body">
              <span className="cc-kpi-label">Total Opportunity Identified</span>
              <span className="cc-kpi-value">{fmtCurrency(totalOpportunityIdentified)}</span>
              <span className="cc-kpi-note">Based on latest audit per client</span>
            </div>
          </div>

          <div className="cc-kpi">
            <div className="cc-kpi-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="cc-kpi-body">
              <span className="cc-kpi-label">Active Clients</span>
              <span className="cc-kpi-value">{activeClients.length}</span>
              <span className="cc-kpi-note">{clients[0]?.company_name ?? 'No clients created yet'}</span>
            </div>
          </div>

          <div className="cc-kpi">
            <div className="cc-kpi-icon cc-kpi-icon-amber" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="cc-kpi-body">
              <span className="cc-kpi-label">Sites Needing Attention</span>
              <span className="cc-kpi-value">{sitesNeedingAttention}</span>
              <span className="cc-kpi-note">{loading ? 'Loading...' : 'Reviews overdue or opportunity open'}</span>
            </div>
          </div>

          <div className="cc-kpi">
            <div className="cc-kpi-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="cc-kpi-body">
              <span className="cc-kpi-label">Follow-ups Due</span>
              <span className="cc-kpi-value">{overdueReviews.length + dueSoonReviews.length}</span>
              <span className="cc-kpi-note">
                {overdueReviews.length > 0
                  ? `${pluralize(overdueReviews.length, 'review')} overdue`
                  : dueSoonReviews.length > 0
                    ? `${pluralize(dueSoonReviews.length, 'review')} due soon`
                    : 'No upcoming review pressure'}
              </span>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="command-centre-grid">

          <div className="command-centre-main">

            {/* Recent Work — only rendered when data exists */}
            {recentWork.length > 0 && (
              <div className="panel command-centre-panel">
                <div className="panel-header">
                  <div className="cc-panel-header-inner">
                    <div className="cc-panel-icon-wrap" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div>
                      <h3>Recent Work</h3>
                      <p>Last updated audits and projects</p>
                    </div>
                  </div>
                </div>
                <div className="panel-body">
                  <div className="activity-list">
                    {recentWork.map((item) => (
                      <div key={item.id} className="activity-item">
                        <div className="activity-item-copy">
                          <strong>{item.title}</strong>
                          <span className="activity-item-label">{item.type}</span>
                        </div>
                        <div className="cc-rw-meta">
                          <span className="cc-rw-date">{fmtShortDate(item.date)}</span>
                          <Link className="cc-rw-open" to={item.to}>Open →</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Workstream Tasks */}
            <div className="panel command-centre-panel dashboard-task-panel">
              <div className="panel-header">
                <div className="cc-panel-header-inner">
                  <div className="cc-panel-icon-wrap" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </div>
                  <div>
                    <h3>Workstream Tasks</h3>
                    <p>{openTasks > 0 ? `${openTasks} open actions across ${taskGroups.length} lists` : 'Stay on top of your workflow and never miss a priority.'}</p>
                  </div>
                </div>
                <button className="button button-small button-ghost" onClick={addNewGroup}>New list</button>
              </div>
              <div className="panel-body">
                {taskGroups.length === 0 ? (
                  <div className="dashboard-empty-state">
                    <div className="cc-empty-icon" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <line x1="9" y1="9" x2="15" y2="9" />
                        <line x1="9" y1="13" x2="13" y2="13" />
                      </svg>
                    </div>
                    <strong>No task lists yet</strong>
                    <span>Create a workstream list for follow-ups, client prep, or audit actions.</span>
                    <button className="button button-small button-primary" onClick={addNewGroup}>Create task list</button>
                  </div>
                ) : taskGroups.map((group) => (
                  <div key={group.id} className="sub-panel">
                    <div className="sub-panel-header">
                      <div>
                        <button
                          aria-label={group.collapsed ? `Expand ${group.title}` : `Collapse ${group.title}`}
                          onClick={() => toggleGroupCollapse(group.id)}
                          className="button button-small button-icon"
                        >
                          {group.collapsed ? '+' : '-'}
                        </button>
                        <strong>{group.title}</strong>
                        <span>{pluralize(group.tasks.filter((task) => !task.completed).length, 'open task')}</span>
                      </div>
                      <button
                        aria-label={`Remove ${group.title}`}
                        onClick={() => deleteGroup(group.id)}
                        className="button button-small button-ghost"
                      >
                        Remove
                      </button>
                    </div>

                    {!group.collapsed && (
                      <div className="task-list">
                        {group.tasks.length === 0 ? (
                          <div className="dashboard-empty-state compact">
                            <strong>This list is clear</strong>
                            <span>Add the next action to keep the workstream moving.</span>
                          </div>
                        ) : group.tasks.map((task) => (
                          <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                            <input
                              aria-label={`Mark ${task.text} ${task.completed ? 'incomplete' : 'complete'}`}
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTaskComplete(group.id, task.id)}
                            />
                            <span>{task.text}</span>
                            <button
                              aria-label={`Remove ${task.text}`}
                              onClick={() => deleteTask(group.id, task.id)}
                              className="button button-small button-ghost"
                            >
                              Remove
                            </button>
                          </div>
                        ))}

                        <div className="task-add-row">
                          <input
                            type="text"
                            placeholder="Add task..."
                            value={groupInputText[group.id] ?? ''}
                            onChange={(e) => setGroupInputText(prev => ({ ...prev, [group.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addTask(group.id)}
                          />
                          <button className="button button-small" onClick={() => addTask(group.id)}>Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="command-centre-side">

            {/* Quick Actions */}
            <div className="panel command-centre-panel">
              <div className="panel-header">
                <div className="cc-panel-header-inner">
                  <div className="cc-panel-icon-wrap" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <h3>Quick Actions</h3>
                    <p>Start the next client move</p>
                  </div>
                </div>
              </div>
              <div className="panel-body">
                <div className="action-list">
                  <Link className="button button-primary" to="/clients">
                    <span><ActionGlyph type="clients" /></span>
                    Open clients
                  </Link>
                  <Link className="button button-secondary" to="/audit">
                    <span><ActionGlyph type="shield" /></span>
                    Start kitchen audit
                  </Link>
                  <Link className="button button-secondary" to="/menu">
                    <span><ActionGlyph type="document" /></span>
                    Open menu builder
                  </Link>
                  <Link className="button button-secondary" to="/clients/new">
                    <span><ActionGlyph type="plus" /></span>
                    Create new client
                  </Link>
                </div>
              </div>
            </div>

            {/* Attention Required */}
            <div className="panel command-centre-panel attention-panel">
              <div className="panel-header">
                <div className="cc-panel-header-inner">
                  <div className="cc-panel-icon-wrap cc-panel-icon-amber" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <h3>Attention Required</h3>
                    <p>Items needing immediate action</p>
                  </div>
                </div>
              </div>
              <div className="panel-body">
                <div className="attention-item warning">
                  <strong>{overdueReviews.length} Overdue reviews</strong>
                  <span>{overdueReviews.length > 0 ? 'Follow up immediately' : 'No overdue reviews'}</span>
                </div>
                <div className="attention-item blue">
                  <strong>{dueSoonReviews.length} Reviews due soon</strong>
                  <span>Due in next 14 days</span>
                </div>
                <div className="attention-item success">
                  <strong>{audits.length} Total audits</strong>
                  <span>Completed across client portfolio</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="panel command-centre-panel">
              <div className="panel-header">
                <div className="cc-panel-header-inner">
                  <div className="cc-panel-icon-wrap" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <h3>Recent Activity</h3>
                    <p>Latest work across the portfolio</p>
                  </div>
                </div>
              </div>
              <div className="panel-body">
                <div className="activity-list">
                  {recentActivity.length === 0 ? (
                    <div className="dashboard-empty-state compact">
                      <strong>No recent activity yet</strong>
                      <span>Saved audits and menu projects will appear here.</span>
                    </div>
                  ) : recentActivity.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className="activity-item-copy">
                        <strong>{item.title}</strong>
                        <span className="activity-item-label">{item.label}</span>
                      </div>
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
                {recentActivity.length > 0 && (
                  <Link className="cc-view-all-link" to="/clients">View all activity</Link>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </PageContainer>
  );
}
