import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createEmptyClientData } from '../../features/clients/clientData';
import { listAudits } from '../../services/audits';
import { createClientIntakeShare } from '../../services/clientIntakeShares';
import { deleteClient, listClients } from '../../services/clients';
import { listFoodSafetyAudits } from '../../services/foodSafetyAudits';
import type { ClientRecord } from '../../types';

type SortMode = 'attention' | 'updated' | 'review' | 'value' | 'company';

type RecentWorkRow = {
  id: string;
  type: string;
  title: string;
  clientId?: string;
  date: string;
  to: string;
};

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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

function formatReviewLabel(value?: string | null) {
  const remainingDays = daysUntil(value);

  if (remainingDays === null) return 'Review not scheduled';
  if (remainingDays < 0) return `${Math.abs(remainingDays)} day${Math.abs(remainingDays) === 1 ? '' : 's'} overdue`;
  if (remainingDays === 0) return 'Review due today';
  return `Review in ${remainingDays} day${remainingDays === 1 ? '' : 's'}`;
}

function fmtShortDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function statusTone(status?: string | null) {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'active') return 'status-pill status-success';
  if (normalized === 'prospect' || normalized === 'onboarding') return 'status-pill status-warning';
  return 'status-pill status-danger';
}

function buildClientSignals(client: ClientRecord) {
  const data = client.data ?? createEmptyClientData();
  const overdueInvoices = data.invoices.filter((invoice) => invoice.status === 'Overdue').length;
  const openTasks = data.tasks.filter((task) => task.status !== 'Done').length;
  const reviewDays = daysUntil(client.next_review_date);
  const needsAttention =
    data.relationshipHealth === 'At Risk' ||
    overdueInvoices > 0 ||
    (reviewDays !== null && reviewDays < 0);

  const attentionLabel =
    overdueInvoices > 0
      ? `${overdueInvoices} overdue invoice${overdueInvoices === 1 ? '' : 's'}`
      : data.relationshipHealth === 'At Risk'
        ? 'Relationship at risk'
        : reviewDays !== null && reviewDays < 0
          ? 'Review overdue'
          : 'Healthy account';

  return {
    data,
    overdueInvoices,
    openTasks,
    reviewDays,
    needsAttention,
    attentionLabel
  };
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [message, setMessage] = useState('Client list ready.');
  const [intakeUrl, setIntakeUrl] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortMode, setSortMode] = useState<SortMode>('attention');
  const [clientPendingDelete, setClientPendingDelete] = useState<ClientRecord | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [recentWorkRows, setRecentWorkRows] = useState<RecentWorkRow[]>([]);

  useEffect(() => {
    void refreshClients();
  }, []);

  useEffect(() => {
    Promise.allSettled([listAudits(), listFoodSafetyAudits()])
      .then(([auditResult, fsResult]) => {
        const items: RecentWorkRow[] = [
          ...(auditResult.status === 'fulfilled' ? auditResult.value.map((a) => ({
            id: `audit-${a.id}`,
            type: 'Kitchen Audit',
            title: a.title || a.site_name || 'Kitchen Audit',
            clientId: a.client_id ?? undefined,
            date: a.updated_at ?? a.created_at ?? '',
            to: `/audit?load=${a.id}`
          })) : []),
          ...(fsResult.status === 'fulfilled' ? fsResult.value.map((a) => ({
            id: `fs-${a.id}`,
            type: 'Food Safety',
            title: a.title || a.site_name || 'Food Safety Audit',
            clientId: a.client_id ?? undefined,
            date: a.updated_at ?? a.created_at ?? '',
            to: `/food-safety?load=${a.id}`
          })) : [])
        ]
          .filter((item) => !!item.date)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 4);
        setRecentWorkRows(items);
      })
      .catch(() => {});
  }, []);

  async function refreshClients() {
    try {
      const rows = await listClients();
      setClients(rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load clients.');
    } finally {
      setLoadingClients(false);
    }
  }

  async function handleDelete() {
    if (!clientPendingDelete) return;

    try {
      setIsDeletingClient(true);
      await deleteClient(clientPendingDelete.id);
      setMessage(`Client "${clientPendingDelete.company_name}" deleted.`);
      setClientPendingDelete(null);
      await refreshClients();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete client.');
    } finally {
      setIsDeletingClient(false);
    }
  }

  async function handleCreateIntakeLink() {
    try {
      const share = await createClientIntakeShare({
        presetLeadSource: 'Client enquiry form',
        message:
          'Please complete this short enquiry form and we will review your information and come back to you as soon as possible.'
      });
      const shareUrl = `${window.location.origin}/#/intake/client/${share.token}`;
      setIntakeUrl(shareUrl);

      try {
        await navigator.clipboard.writeText(shareUrl);
        setMessage('Client enquiry link created and copied.');
      } catch {
        setMessage('Client enquiry link created. Copy it from the field below.');
      }
    } catch (error) {
      setIntakeUrl('');
      setMessage(
        error instanceof Error ? error.message : 'Could not create the enquiry link.'
      );
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('All');
  }

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.company_name);
    return map;
  }, [clients]);

  const recentWork = useMemo(() => {
    return recentWorkRows.map((item) => ({
      ...item,
      clientName: item.clientId ? (clientMap.get(item.clientId) ?? undefined) : undefined
    }));
  }, [recentWorkRows, clientMap]);

  const visibleClients = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    const filtered = clients.filter((client) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          client.company_name,
          client.contact_name,
          client.contact_email,
          client.location,
          client.industry,
          ...(client.tags ?? [])
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const matchesStatus =
        statusFilter === 'All' ||
        (client.status ?? 'Active').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const aSignals = buildClientSignals(a);
      const bSignals = buildClientSignals(b);

      if (sortMode === 'company') {
        return (a.company_name ?? '').localeCompare(b.company_name ?? '');
      }

      if (sortMode === 'review') {
        return (aSignals.reviewDays ?? Number.MAX_SAFE_INTEGER) - (bSignals.reviewDays ?? Number.MAX_SAFE_INTEGER);
      }

      if (sortMode === 'value') {
        return bSignals.data.estimatedMonthlyValue - aSignals.data.estimatedMonthlyValue;
      }

      if (sortMode === 'attention') {
        if (aSignals.needsAttention !== bSignals.needsAttention) {
          return aSignals.needsAttention ? -1 : 1;
        }

        if (aSignals.overdueInvoices !== bSignals.overdueInvoices) {
          return bSignals.overdueInvoices - aSignals.overdueInvoices;
        }

        return (aSignals.reviewDays ?? Number.MAX_SAFE_INTEGER) - (bSignals.reviewDays ?? Number.MAX_SAFE_INTEGER);
      }

      return getTimestamp(b.updated_at ?? b.created_at) - getTimestamp(a.updated_at ?? a.created_at);
    });
  }, [clients, deferredSearch, sortMode, statusFilter]);

  const summary = useMemo(() => {
    let attentionCount = 0;
    let activeCount = 0;
    let overdueInvoices = 0;
    let openTasks = 0;
    let totalMonthlyValue = 0;

    for (const client of visibleClients) {
      const signals = buildClientSignals(client);
      if ((client.status ?? 'Active').toLowerCase() === 'active') activeCount += 1;
      if (signals.needsAttention) attentionCount += 1;
      overdueInvoices += signals.overdueInvoices;
      openTasks += signals.openTasks;
      totalMonthlyValue += signals.data.estimatedMonthlyValue;
    }

    return {
      attentionCount,
      activeCount,
      overdueInvoices,
      openTasks,
      totalMonthlyValue
    };
  }, [visibleClients]);

  const nextClientAction = useMemo(() => {
    const overdue = clients.find((c) => {
      const d = daysUntil(c.next_review_date);
      return d !== null && d < 0;
    });
    if (overdue) return { client: overdue, reason: 'Review overdue' };

    const dueSoon = clients.find((c) => {
      const d = daysUntil(c.next_review_date);
      return d !== null && d >= 0 && d <= 14;
    });
    if (dueSoon) return { client: dueSoon, reason: 'Review due soon' };

    const latest = clients.find((c) => (c.status ?? 'Active').toLowerCase() === 'active');
    if (latest) return { client: latest, reason: 'Latest active account' };

    return null;
  }, [clients]);

  const reviewsDueSoonCount = useMemo(() => {
    return clients.filter((c) => {
      const d = daysUntil(c.next_review_date);
      return d !== null && d >= 0 && d <= 14;
    }).length;
  }, [clients]);

  const latestUpdatedClient = useMemo(() => {
    return [...clients].sort(
      (a, b) => getTimestamp(b.updated_at ?? b.created_at) - getTimestamp(a.updated_at ?? a.created_at)
    )[0] ?? null;
  }, [clients]);

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'All';
  const latestVisibleClient = visibleClients[0] ?? null;

  return (
    <div className="page-stack clients-page">
      {/* Page header */}
      <div className="clients-header">
        <div className="clients-header-copy">
          <span className="clients-header-eyebrow">Clients</span>
          <h1 className="clients-header-title">Client CRM</h1>
          <p className="clients-header-desc">
            Manage accounts, spot risk early, and move quickly into the next client action.
          </p>
          <div className="clients-header-chips">
            <span className="clients-status-chip">{summary.activeCount} active account{summary.activeCount === 1 ? '' : 's'}</span>
            {message && <span className="clients-status-chip clients-status-chip-message">{message}</span>}
          </div>
        </div>
        <div className="clients-header-actions">
          <Link className="button button-primary" to="/clients/new">
            New client
          </Link>
          <button className="button button-secondary" onClick={handleCreateIntakeLink} type="button">
            Enquiry link
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="clients-kpi-grid" aria-label="Client summary">
        <div className="clients-kpi-card">
          <div className="clients-kpi-icon">
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="16"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          </div>
          <div className="clients-kpi-body">
            <span className="clients-kpi-label">Needs attention</span>
            <span className="clients-kpi-value">{summary.attentionCount}</span>
            <span className="clients-kpi-note">Overdue reviews, invoices, or risk</span>
          </div>
        </div>

        <div className="clients-kpi-card">
          <div className="clients-kpi-icon">
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="16"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <div className="clients-kpi-body">
            <span className="clients-kpi-label">Open actions</span>
            <span className="clients-kpi-value">{summary.openTasks}</span>
            <span className="clients-kpi-note">Live tasks across the account book</span>
          </div>
        </div>

        <div className="clients-kpi-card">
          <div className="clients-kpi-icon">
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div className="clients-kpi-body">
            <span className="clients-kpi-label">Overdue invoices</span>
            <span className="clients-kpi-value">{summary.overdueInvoices}</span>
            <span className="clients-kpi-note">Need finance follow-up</span>
          </div>
        </div>

        <div className="clients-kpi-card">
          <div className="clients-kpi-icon">
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="16"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div className="clients-kpi-body">
            <span className="clients-kpi-label">Monthly value</span>
            <span className="clients-kpi-value">£{summary.totalMonthlyValue.toLocaleString('en-GB')}</span>
            <span className="clients-kpi-note">Estimated across visible accounts</span>
          </div>
        </div>
      </div>

      <div className="clients-grid">
        <main className="clients-main">
          {/* Client list */}
          <div className="clients-panel clients-list-section">
            <div className="clients-panel-header">
              <div className="clients-panel-heading">
                <div className="clients-panel-icon">
                  <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="14"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                </div>
                <div>
                  <h2>Client List</h2>
                  <p>{loadingClients ? 'Loading accounts…' : `${clients.length} account${clients.length === 1 ? '' : 's'} in workspace`}</p>
                </div>
              </div>
              <span className="status-pill">{visibleClients.length}</span>
            </div>

            <div className="clients-filter-row">
              <label className="clients-filter-field">
                <span className="clients-filter-label">Search</span>
                <input
                  className="input"
                  placeholder="Company, contact, email, location, or tag…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="clients-filter-field clients-filter-field-sm">
                <span className="clients-filter-label">Status</span>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option>All</option>
                  <option>Active</option>
                  <option>Prospect</option>
                  <option>Onboarding</option>
                  <option>Paused</option>
                  <option>Completed</option>
                </select>
              </label>
              <label className="clients-filter-field clients-filter-field-sm">
                <span className="clients-filter-label">Sort</span>
                <select
                  className="input"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="attention">Attention first</option>
                  <option value="updated">Last updated</option>
                  <option value="review">Next review</option>
                  <option value="value">Monthly value</option>
                  <option value="company">Company A-Z</option>
                </select>
              </label>
            </div>

            {hasActiveFilters && (
              <div className="clients-filter-clear-row">
                <span className="clients-result-count">
                  {visibleClients.length} of {clients.length} {clients.length === 1 ? 'client' : 'clients'}
                </span>
                <button
                  className="button button-small button-ghost clients-filter-clear"
                  onClick={clearFilters}
                  type="button"
                >
                  Clear filters
                </button>
              </div>
            )}

            {!loadingClients && clients.length === 0 ? (
              <div className="clients-empty-premium">
                <div className="clients-empty-premium-icon" aria-hidden="true">
                  <svg fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="22"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                </div>
                <strong>No clients yet</strong>
                <span>Create your first client profile to start managing your account book.</span>
                <div className="clients-empty-premium-actions">
                  <Link className="button button-primary" to="/clients/new">New client</Link>
                  <button className="button button-secondary" onClick={handleCreateIntakeLink} type="button">
                    Enquiry link
                  </button>
                </div>
              </div>
            ) : visibleClients.length === 0 ? (
              <div className="clients-empty-state">
                {hasActiveFilters ? (
                  <>No clients match these filters. </>
                ) : (
                  <>No clients found. </>
                )}
              </div>
            ) : (
              <div className="clients-account-list">
                {visibleClients.map((client) => {
                  const signals = buildClientSignals(client);
                  return (
                    <article
                      className={`clients-account-card${signals.needsAttention ? ' is-attention' : ''}`}
                      key={client.id}
                    >
                      <div className="clients-account-identity">
                        <div className="clients-row-avatar">
                          {(client.company_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="clients-row-names">
                          <span className="clients-row-company">{client.company_name}</span>
                          <span className="clients-row-contact">{client.contact_name || 'No contact set'}</span>
                          {(client.location || client.industry) && (
                            <span className="clients-row-location">
                              {[client.location, client.industry].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="clients-account-metrics">
                        <div className="clients-row-metric">
                          <small>Next review</small>
                          <span>{formatReviewLabel(client.next_review_date)}</span>
                        </div>
                        <div className="clients-row-metric">
                          <small>Monthly value</small>
                          <span>£{signals.data.estimatedMonthlyValue.toLocaleString('en-GB')}</span>
                        </div>
                        <div className="clients-row-metric">
                          <small>Open tasks</small>
                          <span className={signals.openTasks > 0 ? 'text-danger' : ''}>{signals.openTasks}</span>
                        </div>
                        <div className="clients-row-metric">
                          <small>Overdue invoices</small>
                          <span className={signals.overdueInvoices > 0 ? 'text-danger' : ''}>{signals.overdueInvoices}</span>
                        </div>
                      </div>

                      <div className="clients-account-actions">
                        <div className="clients-row-badges">
                          <span className={statusTone(client.status)}>{client.status || 'Active'}</span>
                          {signals.needsAttention && (
                            <span className="status-pill status-danger">{signals.attentionLabel}</span>
                          )}
                        </div>
                        <div className="clients-row-actions">
                          <Link className="button button-small button-primary" to={`/clients/${client.id}`}>
                            Open profile
                          </Link>
                          <Link className="button button-small button-secondary" to={`/audit?client=${client.id}&new=1`}>
                            Start audit
                          </Link>
                          <button
                            className="button button-small button-ghost danger-text"
                            onClick={() => setClientPendingDelete(client)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <aside className="clients-side">
          {/* Next Client Action spotlight */}
          {clients.length > 0 && (
            <div className="clients-panel clients-spotlight-panel">
              <div className="clients-panel-header">
                <div className="clients-panel-heading">
                  <div className="clients-panel-icon clients-panel-icon-amber">
                    <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </div>
                  <div>
                    <h2>Next Client Action</h2>
                    <p>Suggested client to open now</p>
                  </div>
                </div>
              </div>
              {nextClientAction ? (
                <div className="clients-spotlight-body">
                  <div className="clients-spotlight-identity">
                    <div className="clients-row-avatar">
                      {(nextClientAction.client.company_name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="clients-spotlight-names">
                      <strong>{nextClientAction.client.company_name}</strong>
                      <span>{nextClientAction.reason}</span>
                    </div>
                  </div>
                  <div className="clients-spotlight-actions">
                    <Link className="button button-primary" to={`/clients/${nextClientAction.client.id}`}>
                      Open profile
                    </Link>
                    <Link className="button button-secondary" to={`/audit?client=${nextClientAction.client.id}&new=1`}>
                      Start audit
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="clients-spotlight-empty">
                  <span>No immediate client action needed.</span>
                </div>
              )}
            </div>
          )}

          <div className="clients-panel clients-side-action-card">
            <div className="clients-panel-header">
              <div className="clients-panel-heading">
                <div className="clients-panel-icon">
                  <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="14"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                </div>
                <div>
                  <h2>Client Actions</h2>
                  <p>Move straight into the next account step</p>
                </div>
              </div>
            </div>
            <div className="clients-side-actions">
              <Link className="button button-primary" to="/clients/new">New client</Link>
              <button className="button button-secondary" onClick={handleCreateIntakeLink} type="button">
                Enquiry link
              </button>
              {latestVisibleClient ? (
                <Link className="button button-secondary" to={`/clients/${latestVisibleClient.id}`}>
                  Open latest client
                </Link>
              ) : null}
            </div>

            {intakeUrl ? (
              <div className="clients-intake-card">
                <span>Enquiry link ready</span>
                <input
                  className="input"
                  readOnly
                  value={intakeUrl}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <div className="clients-intake-actions">
                  <button
                    className="button button-small button-secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(intakeUrl);
                        setMessage('Client enquiry link copied.');
                      } catch (error) {
                        setMessage(
                          error instanceof Error ? error.message : 'Could not copy the enquiry link.'
                        );
                      }
                    }}
                    type="button"
                  >
                    Copy link
                  </button>
                  <a className="button button-small button-ghost" href={intakeUrl} rel="noreferrer" target="_blank">
                    Open
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          <div className="clients-panel clients-health-panel">
            <div className="clients-panel-header">
              <div className="clients-panel-heading">
                <div className="clients-panel-icon">
                  <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="14"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-7"/></svg>
                </div>
                <div>
                  <h2>Account Health</h2>
                  <p>Portfolio summary for visible accounts</p>
                </div>
              </div>
            </div>
            <div className="clients-health-list">
              <div className="clients-health-row">
                <span>Active accounts</span>
                <strong>{summary.activeCount}</strong>
              </div>
              <div className="clients-health-row is-warning">
                <span>Needs attention</span>
                <strong>{summary.attentionCount}</strong>
              </div>
              <div className="clients-health-row">
                <span>Open actions</span>
                <strong>{summary.openTasks}</strong>
              </div>
              <div className="clients-health-row">
                <span>Monthly value</span>
                <strong>£{summary.totalMonthlyValue.toLocaleString('en-GB')}</strong>
              </div>
              {reviewsDueSoonCount > 0 && (
                <div className="clients-health-row">
                  <span>Reviews due soon</span>
                  <strong>{reviewsDueSoonCount}</strong>
                </div>
              )}
              {latestUpdatedClient && (
                <div className="clients-health-row clients-health-row-latest">
                  <span>Latest account</span>
                  <span className="clients-health-latest-name">{latestUpdatedClient.company_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Client Work */}
          {recentWork.length > 0 && (
            <div className="clients-panel clients-recent-work-panel">
              <div className="clients-panel-header">
                <div className="clients-panel-heading">
                  <div className="clients-panel-icon">
                    <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <h2>Recent Client Work</h2>
                    <p>Latest audits linked to accounts</p>
                  </div>
                </div>
              </div>
              <div className="clients-recent-work-list">
                {recentWork.map((item) => (
                  <div key={item.id} className="clients-recent-work-row">
                    <div className="clients-recent-work-copy">
                      <span className="clients-recent-work-title">{item.title}</span>
                      <span className="clients-recent-work-type">
                        {item.type}{item.clientName ? ` · ${item.clientName}` : ''}
                      </span>
                    </div>
                    <div className="clients-recent-work-meta">
                      <span className="clients-recent-work-date">{fmtShortDate(item.date)}</span>
                      <Link className="cc-rw-open" to={item.to} aria-label={`Open ${item.title}`}>
                        Open →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {clientPendingDelete ? (
        <div className="confirm-modal-overlay" role="presentation">
          <div
            aria-labelledby="delete-client-title"
            aria-modal="true"
            className="confirm-modal-card"
            role="dialog"
          >
            <p className="confirm-modal-kicker">Delete client</p>
            <h3 id="delete-client-title">Delete {clientPendingDelete.company_name}?</h3>
            <p className="confirm-modal-body">
              This will remove the client profile from your workspace. This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="button button-secondary"
                disabled={isDeletingClient}
                onClick={() => setClientPendingDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-ghost danger-text"
                disabled={isDeletingClient}
                onClick={handleDelete}
                type="button"
              >
                {isDeletingClient ? 'Deleting...' : 'Delete client'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
