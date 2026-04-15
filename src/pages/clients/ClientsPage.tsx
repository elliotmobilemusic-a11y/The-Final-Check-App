import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { createEmptyClientData } from '../../features/clients/clientData';
import { createClientIntakeShare } from '../../services/clientIntakeShares';
import { deleteClient, listClients } from '../../services/clients';
import type { ClientRecord } from '../../types';

type SortMode = 'attention' | 'updated' | 'review' | 'value' | 'company';

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

function statusTone(status?: string | null) {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'active') return 'status-pill status-success';
  if (normalized === 'prospect' || normalized === 'onboarding') return 'status-pill status-warning';
  return 'status-pill status-danger';
}

function relationshipTone(health?: string | null) {
  const normalized = (health ?? '').toLowerCase();
  if (normalized === 'strong') return 'status-pill status-success';
  if (normalized === 'watch') return 'status-pill status-warning';
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
  const [message, setMessage] = useState('Client list ready.');
  const [intakeUrl, setIntakeUrl] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortMode, setSortMode] = useState<SortMode>('attention');
  const [clientPendingDelete, setClientPendingDelete] = useState<ClientRecord | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  useEffect(() => {
    void refreshClients();
  }, []);

  async function refreshClients() {
    try {
      const rows = await listClients();
      setClients(rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load clients.');
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

  const featuredAttention = useMemo(
    () => visibleClients.filter((client) => buildClientSignals(client).needsAttention).slice(0, 3),
    [visibleClients]
  );

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Clients"
        title="Client CRM"
        description="Use this as a clear operating view for the whole account book: what needs attention, what is active, and where to go next."
      >
        <div className="page-inline-note">{summary.activeCount} active accounts</div>
        <div className="page-inline-note">{visibleClients.length} visible</div>
        <div className="page-inline-note">{message}</div>
      </PageIntro>

      <section className="panel">
        <div className="panel-body stack gap-20">
          <div className="crm-list-top crm-list-top-compact">
            <div>
              <h3>Account book</h3>
              <p>Find the right client quickly, spot risk early, and move straight into the record.</p>
            </div>
            <div className="crm-list-top-meta">
              <button className="button button-ghost" onClick={handleCreateIntakeLink} type="button">
                Enquiry link
              </button>
              <Link className="button button-secondary" to="/clients/new">
                New client
              </Link>
            </div>
          </div>

          <section className="crm-highlight-grid" aria-label="Client summary">
            <article className="crm-highlight-card">
              <span>Needs attention</span>
              <strong>{summary.attentionCount}</strong>
              <p>Accounts with overdue reviews, overdue invoices, or relationship risk.</p>
            </article>
            <article className="crm-highlight-card">
              <span>Open actions</span>
              <strong>{summary.openTasks}</strong>
              <p>Live client tasks currently still open across the visible book.</p>
            </article>
            <article className="crm-highlight-card">
              <span>Overdue invoices</span>
              <strong>{summary.overdueInvoices}</strong>
              <p>Invoice items that need finance follow-up or release decisions.</p>
            </article>
            <article className="crm-highlight-card">
              <span>Monthly value</span>
              <strong>£{summary.totalMonthlyValue.toLocaleString('en-GB')}</strong>
              <p>Estimated monthly value across the clients in the current view.</p>
            </article>
          </section>

          <div className="crm-controls-grid crm-controls-grid-inline">
            <label className="field">
              <span>Search clients</span>
              <input
                className="input"
                placeholder="Search company, contact, email, location, or tag"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Status</span>
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

            <label className="field">
              <span>Sort</span>
              <select
                className="input"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                <option value="attention">Attention first</option>
                <option value="updated">Last updated</option>
                <option value="review">Next review date</option>
                <option value="value">Estimated monthly value</option>
                <option value="company">Company name</option>
              </select>
            </label>
          </div>

          {intakeUrl ? (
            <div className="share-link-row">
              <input
                className="input"
                readOnly
                value={intakeUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                className="button button-secondary"
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
              <a className="button button-ghost" href={intakeUrl} rel="noreferrer" target="_blank">
                Open
              </a>
            </div>
          ) : null}

          {featuredAttention.length > 0 ? (
            <section className="crm-attention-strip">
              <div className="crm-section-heading">
                <div>
                  <p className="client-portal-section-kicker">Priority accounts</p>
                  <h4>What needs looking at first</h4>
                </div>
                <span className="status-pill status-danger">{featuredAttention.length}</span>
              </div>

              <div className="crm-attention-grid">
                {featuredAttention.map((client) => {
                  const signals = buildClientSignals(client);

                  return (
                    <article className="crm-attention-card" key={client.id}>
                      <div className="crm-attention-card-top">
                        <strong>{client.company_name}</strong>
                        <span className="status-pill status-danger">{signals.attentionLabel}</span>
                      </div>
                      <p>
                        {client.location || 'Location not set'}
                        {client.contact_name ? ` • ${client.contact_name}` : ''}
                      </p>
                      <div className="crm-attention-card-actions">
                        <Link className="button button-primary" to={`/clients/${client.id}`}>
                          Open account
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {visibleClients.length === 0 ? (
            <div className="dashboard-empty" style={{ padding: '48px 20px' }}>
              No clients match the current search or filter settings.
            </div>
          ) : (
            <section className="crm-client-list">
              <div className="crm-section-heading">
                <div>
                  <p className="client-portal-section-kicker">Client list</p>
                  <h4>All visible accounts</h4>
                </div>
                <span className="status-pill">{visibleClients.length}</span>
              </div>

              <div className="clients-long-list">
                {visibleClients.map((client) => {
                  const signals = buildClientSignals(client);
                  const siteCount = signals.data.sites.length || signals.data.siteCountEstimate || 1;

                  return (
                    <article
                      className={`crm-client-row crm-client-row-redesign${signals.needsAttention ? ' is-attention' : ''}`}
                      key={client.id}
                    >
                      <div className="crm-client-main crm-client-main-redesign">
                        <div className="crm-client-topbar">
                          <div className="crm-client-title-block">
                            <strong>{client.company_name}</strong>
                            <p>
                              {client.location || 'Location not set'}
                              {client.contact_name ? ` • ${client.contact_name}` : ''}
                              {client.contact_email ? ` • ${client.contact_email}` : ''}
                            </p>
                          </div>

                          <div className="crm-client-badges">
                            <span className={statusTone(client.status)}>{client.status || 'Active'}</span>
                            <span className={relationshipTone(signals.data.relationshipHealth)}>
                              {signals.data.relationshipHealth}
                            </span>
                          </div>
                        </div>

                        <div className="crm-client-meta-grid">
                          <div className="crm-inline-stat">
                            <span>Next review</span>
                            <strong>{formatReviewLabel(client.next_review_date)}</strong>
                          </div>
                          <div className="crm-inline-stat">
                            <span>Open tasks</span>
                            <strong>{signals.openTasks}</strong>
                          </div>
                          <div className="crm-inline-stat">
                            <span>Sites</span>
                            <strong>{siteCount}</strong>
                          </div>
                          <div className="crm-inline-stat">
                            <span>Monthly value</span>
                            <strong>£{signals.data.estimatedMonthlyValue.toLocaleString('en-GB')}</strong>
                          </div>
                        </div>

                        <div className="crm-client-supporting-copy">
                          <div className="crm-client-flag-list">
                            <span className={`crm-alert-chip ${signals.needsAttention ? 'is-critical' : 'is-stable'}`}>
                              {signals.attentionLabel}
                            </span>
                            {signals.overdueInvoices > 0 ? (
                              <span className="crm-alert-chip is-warning">
                                {signals.overdueInvoices} overdue invoice{signals.overdueInvoices === 1 ? '' : 's'}
                              </span>
                            ) : null}
                            {client.industry ? <span className="crm-alert-chip">{client.industry}</span> : null}
                            {signals.data.accountOwner ? (
                              <span className="crm-alert-chip">Owner {signals.data.accountOwner}</span>
                            ) : null}
                          </div>
                          <p>
                            {signals.data.profileSummary ||
                              client.notes ||
                              'No account summary has been recorded yet.'}
                          </p>
                        </div>
                      </div>

                      <div className="crm-client-actions crm-client-action-stack">
                        <Link className="button button-primary" to={`/clients/${client.id}`}>
                          Open account
                        </Link>
                        <button
                          className="button button-ghost danger-text"
                          onClick={() => setClientPendingDelete(client)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </section>

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
