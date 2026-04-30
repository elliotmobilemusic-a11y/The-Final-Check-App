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
import { PageContainer, PageHeader } from '../../components/layout';
import { StatCard } from '../../components/ui/StatCard';

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
    () => readDraft<TaskGroup[]>(DASHBOARD_TASKS_DRAFT_KEY) ?? defaultTaskGroups
  );
  const [groupInputText, setGroupInputText] = useState<Record<string, string>>({});

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
    <PageContainer size="wide" className="dashboard-page">
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

       <PageHeader
         size="compact"
         className="dashboard-intro"
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
       />
      
      {message && <div className="page-inline-note dashboard-sync-note">{message}</div>}

      <div className="stats-grid compact dashboard-stat-row">
        <StatCard
          size="compact"
          label="Total opportunity identified"
          value={fmtCurrency(totalOpportunityIdentified)}
          hint="Based on the latest saved audit per client"
        />
        <StatCard
          size="compact"
          label="Active clients"
          value={String(activeClients.length)}
          hint={clients[0]?.company_name ?? 'No clients created yet'}
        />
        <StatCard
          size="compact"
          label="Sites needing attention"
          value={String(sitesNeedingAttention)}
          hint={loading ? 'Loading command centre...' : 'Reviews overdue or profit opportunity still open'}
        />
        <StatCard
          size="compact"
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
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main-zone">
          <div className="panel dashboard-task-panel">
            <div className="panel-header">
              <div>
                <h3>Workstream Tasks</h3>
                <p>{openTasks > 0 ? `${openTasks} open actions across ${taskGroups.length} lists` : 'No open task pressure recorded'}</p>
              </div>
              <button className="button button-small button-ghost" onClick={addNewGroup}>New list</button>
            </div>
            <div className="panel-body">
              {taskGroups.length === 0 ? (
                <div className="dashboard-empty-state">
                  <strong>No task lists yet</strong>
                  <span>Create a workstream list for follow-ups, client prep, or audit actions.</span>
                  <button className="button button-small button-primary" onClick={addNewGroup}>Create list</button>
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

        <div className="dashboard-side-zone">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Quick Actions</h3>
                <p>Start the next client move</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="action-list">
                <Link className="button button-primary" to="/clients/new">
                  Create new client
                </Link>
                <Link className="button button-secondary" to="/audit">
                  Start kitchen audit
                </Link>
                <Link className="button button-secondary" to="/menu">
                  Open menu builder
                </Link>
                <Link className="button button-secondary" to="/food-safety">
                  Food safety check
                </Link>
              </div>
            </div>
          </div>

          <div className="panel attention-panel">
            <div className="panel-header">
              <div>
                <h3>Attention Required</h3>
                <p>Items needing immediate action</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="attention-item warning">
                <strong>{overdueReviews.length} Overdue reviews</strong>
                <span>{overdueReviews.length > 0 ? 'Follow up immediately' : 'No overdue reviews'}</span>
              </div>
              <div className="attention-item">
                <strong>{dueSoonReviews.length} Reviews due soon</strong>
                <span>Due in next 14 days</span>
              </div>
              <div className="attention-item success">
                <strong>{audits.length} Total audits</strong>
                <span>Completed across client portfolio</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Recent Activity</h3>
                <p>Latest work across the portfolio</p>
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
            </div>
          </div>
        </div>
      </div>
      </div>
    </PageContainer>
  );
}
