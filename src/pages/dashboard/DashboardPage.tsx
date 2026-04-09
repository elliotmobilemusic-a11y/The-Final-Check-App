import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import type { ClientRecord } from '../../types';
import { listAudits } from '../../services/audits';
import { listClients } from '../../services/clients';
import { listMenuProjects } from '../../services/menus';
import { readDraft, writeDraft } from '../../services/draftStore';
import { calculateKitchenProfitMetrics } from '../../features/profit/kitchenProfit';
import { fmtCurrency } from '../../lib/utils';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type AuditRows = Awaited<ReturnType<typeof listAudits>>;
type ClientRows = Awaited<ReturnType<typeof listClients>>;
type MenuRows = Awaited<ReturnType<typeof listMenuProjects>>;

type DashboardActivity = {
  id: string;
  label: string;
  title: string;
  detail: string;
  href: string;
  action: string;
  updatedAt: string | null;
};

type DashboardQueueItem = {
  id: string;
  status: string;
  title: string;
  detail: string;
  href: string;
  action: string;
  tone: 'success' | 'warning' | 'danger';
};

type PortfolioSummary = {
  client: ClientRecord;
  audits: number;
  menus: number;
  openTasks: number;
  sites: number;
  nextReviewDays: number | null;
  totalWorkstreams: number;
};

function formatShortDate(value?: string | null) {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

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

function statusTone(tone: 'success' | 'warning' | 'danger') {
  if (tone === 'danger') return 'status-pill status-danger';
  if (tone === 'warning') return 'status-pill status-warning';
  return 'status-pill status-success';
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function deriveDisplayName(email?: string | null) {
  if (!email) return 'there';
  return email.split('@')[0].replace(/[._-]+/g, ' ');
}

const repoBaseUrl = 'https://github.com/elliotmobilemusic-a11y/The-Final-Check-App';
const macDownloadUrl = `${repoBaseUrl}/releases/latest/download/the-final-check-mac.dmg`;
const windowsDownloadUrl = `${repoBaseUrl}/releases/latest/download/the-final-check-win.exe`;
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

export function DashboardPage() {
  const { session } = useAuth();
  const { preferences } = usePreferences();
  const [clients, setClients] = useState<ClientRows>([]);
  const [audits, setAudits] = useState<AuditRows>([]);
  const [menus, setMenus] = useState<MenuRows>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Portfolio loaded.');
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<'ready' | 'installed' | 'manual'>('manual');

  useEffect(() => {
    async function load() {
      try {
        const [clientRows, auditRows, menuRows] = await Promise.all([
          listClients(),
          listAudits(),
          listMenuProjects()
        ]);

        setClients(sortNewest(clientRows));
        setAudits(sortNewest(auditRows));
        setMenus(sortNewest(menuRows));
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

  const clientNameById = useMemo(
    () =>
      new Map(
        clients.map((client) => [client.id, client.company_name || client.location || 'Client'])
      ),
    [clients]
  );

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

  const totalProjects = audits.length + menus.length;
  const linkedProjects =
    audits.filter((audit) => audit.client_id).length +
    menus.filter((menu) => menu.client_id).length;
  const activeClients = portfolio.filter(
    (item) => (item.client.status ?? 'Active').toLowerCase() !== 'inactive'
  );
  const clientsWithBothModules = portfolio.filter((item) => item.audits > 0 && item.menus > 0);
  const clientsWithoutWorkstreams = portfolio.filter((item) => item.totalWorkstreams === 0);
  const openTaskCount = portfolio.reduce((sum, item) => sum + item.openTasks, 0);
  const totalSites = portfolio.reduce((sum, item) => sum + item.sites, 0);
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

  const recentAudits = useMemo(() => audits.slice(0, 4), [audits]);
  const recentMenus = useMemo(() => menus.slice(0, 4), [menus]);
  const spotlightClients = useMemo(
    () =>
      [...portfolio]
        .sort((a, b) => {
          if (b.totalWorkstreams !== a.totalWorkstreams) {
            return b.totalWorkstreams - a.totalWorkstreams;
          }

          return getTimestamp(b.client.updated_at) - getTimestamp(a.client.updated_at);
        })
        .slice(0, 4),
    [portfolio]
  );

  const activityFeed = useMemo<DashboardActivity[]>(() => {
    const auditActivity = audits.map((audit) => ({
      id: `audit-${audit.id}`,
      label: 'Audit',
      title: audit.title || 'Kitchen audit',
      detail: `${
        clientNameById.get(audit.client_id ?? '') ?? audit.site_name ?? 'Unlinked audit'
      } • ${formatShortDate(audit.review_date || audit.updated_at)}`,
      href: `/audit?load=${audit.id}`,
      action: 'Open audit',
      updatedAt: audit.updated_at
    }));

    const menuActivity = menus.map((menu) => ({
      id: `menu-${menu.id}`,
      label: 'Menu',
      title: menu.title || 'Menu project',
      detail: `${
        clientNameById.get(menu.client_id ?? '') ?? menu.site_name ?? 'Unlinked menu review'
      } • ${formatShortDate(menu.review_date || menu.updated_at)}`,
      href: `/menu?load=${menu.id}`,
      action: 'Open menu',
      updatedAt: menu.updated_at
    }));

    const clientActivity = clients.map((client) => ({
      id: `client-${client.id}`,
      label: 'Client',
      title: client.company_name || 'Client profile',
      detail: `${client.status || 'Status not set'} • ${client.location || 'Location not set'}`,
      href: `/clients/${client.id}`,
      action: 'Open client',
      updatedAt: client.updated_at
    }));

    return [...auditActivity, ...menuActivity, ...clientActivity]
      .sort((a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt))
      .slice(0, 8);
  }, [audits, clientNameById, clients, menus]);

  const latestUpdated = useMemo(() => {
    const dates = [...audits, ...menus, ...clients]
      .map((item) => item.updated_at)
      .filter(Boolean)
      .map((value) => getTimestamp(value))
      .filter((value) => value > 0);

    if (!dates.length) return 'No saved work yet';

    return formatShortDate(new Date(Math.max(...dates)).toISOString());
  }, [audits, clients, menus]);

  const systemStatus = useMemo(() => {
    if (clients.length === 0 && totalProjects === 0) {
      return {
        label: 'Setup',
        tone: 'warning' as const,
        detail: 'Create your first client and start building the portfolio.'
      };
    }

    if (overdueReviews.length > 0) {
      return {
        label: 'Attention needed',
        tone: 'danger' as const,
        detail: `${pluralize(overdueReviews.length, 'review')} overdue across the portfolio.`
      };
    }

    if (clientsWithBothModules.length > 0 && linkedProjects > 0) {
      return {
        label: 'Operational',
        tone: 'success' as const,
        detail: `${pluralize(clientsWithBothModules.length, 'client')} running with audit and menu coverage.`
      };
    }

    return {
      label: 'Building',
      tone: 'warning' as const,
      detail: 'The system is active, but a few workflow layers still need filling in.'
    };
  }, [
    clients.length,
    clientsWithBothModules.length,
    linkedProjects,
    overdueReviews.length,
    totalProjects
  ]);

  const commandDeck = useMemo(
    () => [
      {
        id: 'client',
        kicker: 'Client records',
        title: 'Add or refine a client profile',
        detail: 'Keep all audits, menu reviews, contacts, and follow-up actions anchored to the right business.',
        href: spotlightClients[0] ? `/clients/${spotlightClients[0].client.id}` : '/clients',
        action: spotlightClients[0] ? 'Open strongest client' : 'Create client'
      },
      {
        id: 'audit',
        kicker: 'Audit flow',
        title: recentAudits[0] ? `Continue ${recentAudits[0].title}` : 'Start a new kitchen audit',
        detail: recentAudits[0]
          ? `${recentAudits[0].site_name || 'Saved audit'} is the latest operational review in the system.`
          : 'Capture margin pressure, waste, systems, layout issues, and priority actions.',
        href: recentAudits[0] ? `/audit?load=${recentAudits[0].id}` : '/audit',
        action: recentAudits[0] ? 'Resume audit' : 'Start audit'
      },
      {
        id: 'menu',
        kicker: 'Menu engine',
        title: recentMenus[0] ? `Continue ${recentMenus[0].title}` : 'Open menu builder',
        detail: recentMenus[0]
          ? `${recentMenus[0].site_name || 'Saved menu'} is the latest pricing and GP review.`
          : 'Work through dish costing, GP targets, mix, and section-level pricing decisions.',
        href: recentMenus[0] ? `/menu?load=${recentMenus[0].id}` : '/menu',
        action: recentMenus[0] ? 'Resume menu' : 'Open builder'
      },
      {
        id: 'review',
        kicker: 'Follow-up queue',
        title:
          overdueReviews[0]?.client.company_name ||
          dueSoonReviews[0]?.client.company_name ||
          'Review upcoming follow-up work',
        detail:
          overdueReviews[0] || dueSoonReviews[0]
            ? 'The review queue already has client work that needs attention.'
            : 'Use the dashboard to spot clients needing next steps, reviews, or first-time setup.',
        href:
          overdueReviews[0] || dueSoonReviews[0]
            ? `/clients/${(overdueReviews[0] ?? dueSoonReviews[0])?.client.id}`
            : '/clients',
        action: overdueReviews[0] || dueSoonReviews[0] ? 'Open queue leader' : 'Check clients'
      }
    ],
    [dueSoonReviews, overdueReviews, recentAudits, recentMenus, spotlightClients]
  );

  const healthRows = useMemo(
    () => [
      {
        id: 'clients',
        title: 'Client records',
        detail:
          clients.length > 0
            ? `${pluralize(activeClients.length, 'active client')} live in the system.`
            : 'The system still needs its first client record.',
        label: clients.length > 0 ? 'Live' : 'Needs setup',
        tone: clients.length > 0 ? 'success' : 'warning'
      },
      {
        id: 'audit',
        title: 'Audit engine',
        detail:
          audits.length > 0
            ? `${pluralize(audits.length, 'audit')} saved and available to reopen.`
            : 'No audits have been saved yet.',
        label: audits.length > 0 ? 'Running' : 'Empty',
        tone: audits.length > 0 ? 'success' : 'warning'
      },
      {
        id: 'menu',
        title: 'Menu engine',
        detail:
          menus.length > 0
            ? `${pluralize(menus.length, 'menu project')} available for review.`
            : 'No menu reviews have been saved yet.',
        label: menus.length > 0 ? 'Running' : 'Empty',
        tone: menus.length > 0 ? 'success' : 'warning'
      },
      {
        id: 'coverage',
        title: 'Client coverage',
        detail:
          clientsWithBothModules.length > 0
            ? `${pluralize(clientsWithBothModules.length, 'client')} already has both audit and menu history.`
            : 'No client has full module coverage yet.',
        label: clientsWithBothModules.length > 0 ? 'Growing' : 'Building',
        tone: clientsWithBothModules.length > 0 ? 'success' : 'warning'
      },
      {
        id: 'reviews',
        title: 'Review queue',
        detail:
          overdueReviews.length > 0
            ? `${pluralize(overdueReviews.length, 'review')} overdue and needs action.`
            : dueSoonReviews.length > 0
              ? `${pluralize(dueSoonReviews.length, 'review')} due in the next 14 days.`
              : 'No reviews are currently in the danger window.',
        label:
          overdueReviews.length > 0
            ? 'Attention'
            : dueSoonReviews.length > 0
              ? 'Upcoming'
              : 'Clear',
        tone:
          overdueReviews.length > 0
            ? 'danger'
            : dueSoonReviews.length > 0
              ? 'warning'
              : 'success'
      }
    ],
    [activeClients.length, audits.length, clients.length, clientsWithBothModules.length, dueSoonReviews.length, menus.length, overdueReviews.length]
  );

  const queueItems = useMemo<DashboardQueueItem[]>(() => {
    const items: DashboardQueueItem[] = [];

    for (const item of overdueReviews.slice(0, 3)) {
      items.push({
        id: `overdue-${item.client.id}`,
        status: 'Overdue',
        title: `${item.client.company_name} review is overdue`,
        detail: `Next review was due ${Math.abs(item.nextReviewDays ?? 0)} day${Math.abs(item.nextReviewDays ?? 0) === 1 ? '' : 's'} ago.`,
        href: `/clients/${item.client.id}`,
        action: 'Open client',
        tone: 'danger'
      });
    }

    for (const item of dueSoonReviews.slice(0, 3)) {
      items.push({
        id: `soon-${item.client.id}`,
        status: 'Due soon',
        title: `${item.client.company_name} review is coming up`,
        detail: `Next review due in ${item.nextReviewDays} day${item.nextReviewDays === 1 ? '' : 's'}.`,
        href: `/clients/${item.client.id}`,
        action: 'Prepare review',
        tone: 'warning'
      });
    }

    for (const item of clientsWithoutWorkstreams.slice(0, 2)) {
      items.push({
        id: `setup-${item.client.id}`,
        status: 'Setup',
        title: `${item.client.company_name} needs first linked project`,
        detail: 'The profile exists, but there is no audit or menu history attached yet.',
        href: `/clients/${item.client.id}`,
        action: 'Open profile',
        tone: 'success'
      });
    }

    return items.slice(0, 6);
  }, [clientsWithoutWorkstreams, dueSoonReviews, overdueReviews]);

  const coveragePercent =
    totalProjects > 0 ? Math.round((linkedProjects / totalProjects) * 100) : 0;
  const welcomeName =
    preferences.displayName ||
    (typeof session?.user.user_metadata?.display_name === 'string'
      ? session.user.user_metadata.display_name
      : '') ||
    deriveDisplayName(session?.user.email);
  const welcomeLabel = welcomeName.split(/\s+/).filter(Boolean)[0] || welcomeName;
  const platform =
    typeof navigator === 'undefined'
      ? ''
      : `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  const installCopy =
    platform.includes('mac')
      ? 'On Mac, the easiest option is Install App in Chrome or Edge. If your browser does not show the install prompt, use the browser menu and choose Install App.'
      : platform.includes('win')
        ? 'On Windows, install directly from Chrome or Edge for the smoothest app-style experience.'
        : 'Install the app directly from Chrome or Edge for the simplest desktop-style setup.';

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
    () => readDraft<TaskGroup[]>(DASHBOARD_TASKS_DRAFT_KEY) ?? defaultTaskGroups
  );
  const [newTaskText, setNewTaskText] = useState('');

  useEffect(() => {
    writeDraft(DASHBOARD_TASKS_DRAFT_KEY, taskGroups);
  }, [taskGroups]);

  // Show install prompt randomly after random times
  useEffect(() => {
    if (installState === 'installed') return;
    
    // Random chance to show prompt 15% chance after 12 seconds
    const timer = setTimeout(() => {
      if (Math.random() < 0.15) {
        setShowInstallPrompt(true);
      }
    }, 12000);

    return () => clearTimeout(timer);
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
    if (!newTaskText.trim()) return;
    setTaskGroups(groups => groups.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        tasks: [...group.tasks, {
          id: Date.now().toString(),
          text: newTaskText.trim(),
          completed: false
        }]
      };
    }));
    setNewTaskText('');
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

  function updateGroupTitle(groupId: string, title: string) {
    setTaskGroups(groups => groups.map(group => {
      if (group.id !== groupId) return group;
      return { ...group, title };
    }));
  }

  function deleteGroup(groupId: string) {
    setTaskGroups(groups => groups.filter(group => group.id !== groupId));
  }

  return (
    <div className="page-stack">
      {showInstallPrompt && installState !== 'installed' && (
        <div className="install-float-prompt">
          <div className="install-float-copy">
            <span>📥 Install desktop app</span>
          </div>
          <div className="install-float-actions">
            <button className="button button-small" onClick={handleInstallApp}>Download</button>
            <button className="button button-small button-ghost" onClick={dismissInstallPrompt}>Dismiss</button>
          </div>
        </div>
      )}

      <PageIntro
        eyebrow="Command Centre"
        title={`Welcome, ${welcomeLabel}`}
        description="Run the portfolio like a consultancy business: track live clients, profit opportunity identified, follow-ups due, and which sites need attention next."
        actions={
          <>
            <Link className="button button-primary" to="/clients">
              Open clients
            </Link>
            <Link className="button button-secondary" to="/audit">
              Start Kitchen Profit Audit
            </Link>
            <Link className="button button-secondary" to="/menu">
              Open Menu Profit Engine
            </Link>
          </>
        }
      >
      </PageIntro>

      <section className="stats-grid">
        <StatCard
          label="Total opportunity identified"
          value={fmtCurrency(totalOpportunityIdentified)}
          hint="Based on the latest saved audit per client"
        />
        <StatCard
          label="Active clients"
          value={String(activeClients.length)}
          hint={clients[0]?.company_name ?? 'No clients created yet'}
        />
        <StatCard
          label="Sites needing attention"
          value={String(sitesNeedingAttention)}
          hint={loading ? 'Loading command centre...' : 'Reviews overdue or profit opportunity still open'}
        />
        <StatCard
          label="Follow-ups due"
          value={String(overdueReviews.length + dueSoonReviews.length)}
          hint={
            overdueReviews.length > 0
              ? `${pluralize(overdueReviews.length, 'review')} overdue`
              : dueSoonReviews.length > 0
                ? `${pluralize(dueSoonReviews.length, 'review')} due soon`
                : 'No upcoming review pressure'
          }
        />
      </section>

      <section className="card-grid two-columns">
        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3>Tasks</h3>
              <p>Organised check lists</p>
            </div>
            <button className="button button-small button-ghost" onClick={addNewGroup}>+ New list</button>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {taskGroups.map((group) => (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <button onClick={() => toggleGroupCollapse(group.id)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: '4px' }}>
                      {group.collapsed ? '▶' : '▼'}
                    </button>
                    <input
                      type="text"
                      value={group.title}
                      onChange={(e) => updateGroupTitle(group.id, e.target.value)}
                      style={{ border: 0, background: 'transparent', fontWeight: 600, fontSize: '15px', flex: 1 }}
                    />
                    <button onClick={() => deleteGroup(group.id)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}>×</button>
                  </div>
                </div>

                {!group.collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '30px' }}>
                    {group.tasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '6px 0',
                          opacity: task.completed ? 0.5 : 1,
                          transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          transform: task.completed ? 'translateX(4px)' : 'translateX(0)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskComplete(group.id, task.id)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                        />
                        <span style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none', transition: 'all 0.22s ease' }}>
                          {task.text}
                        </span>
                        <button onClick={() => deleteTask(group.id, task.id)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', opacity: 0, transition: 'opacity 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>×</button>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input
                        type="text"
                        placeholder="Add task..."
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTask(group.id)}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}
                      />
                      <button className="button button-small" onClick={() => addTask(group.id)}>+</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3>Quick actions</h3>
              <p>Start work immediately</p>
            </div>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link className="button button-primary" to="/clients/new" style={{ justifyContent: 'flex-start' }}>
              ➕ Create new client
            </Link>
            <Link className="button button-secondary" to="/audit" style={{ justifyContent: 'flex-start' }}>
              📋 Start kitchen audit
            </Link>
            <Link className="button button-secondary" to="/menu" style={{ justifyContent: 'flex-start' }}>
              🍽️ Open menu builder
            </Link>
            <Link className="button button-secondary" to="/food-safety" style={{ justifyContent: 'flex-start' }}>
              🧪 Food safety check
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
