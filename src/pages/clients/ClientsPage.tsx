import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import {
  buildClientPdfHtml,
  invoiceTotal,
  openPrintableHtmlDocument
} from '../../features/clients/clientExports';
import { clientRecordToProfile, createEmptyClientData } from '../../features/clients/clientData';
import { fmtCurrency } from '../../lib/utils';
import { deleteClient, listClients } from '../../services/clients';
import type { ClientRecord } from '../../types';

type SortMode = 'updated' | 'review' | 'value' | 'company' | 'attention';

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatShortDate(value?: string | null) {
  if (!value) return 'No date set';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
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

function reviewLabel(value?: string | null) {
  const delta = daysUntil(value);
  if (delta === null) return 'No review date';
  if (delta < 0) return `${Math.abs(delta)} day${Math.abs(delta) === 1 ? '' : 's'} overdue`;
  if (delta === 0) return 'Due today';
  return `Due in ${delta} day${delta === 1 ? '' : 's'}`;
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

export function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [message, setMessage] = useState('Client list ready.');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortMode, setSortMode] = useState<SortMode>('attention');

  useEffect(() => {
    refreshClients();
  }, []);

  async function refreshClients() {
    try {
      const rows = await listClients();
      setClients(rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load clients.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this client profile?')) return;

    try {
      await deleteClient(id);
      setMessage('Client deleted.');
      await refreshClients();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete client.');
    }
  }

  function handleExportClient(record: ClientRecord) {
    const profile = clientRecordToProfile(record);
    openPrintableHtmlDocument(`${profile.companyName} CRM export`, buildClientPdfHtml(profile));
  }

  const activeClients = useMemo(
    () => clients.filter((client) => (client.status ?? 'Active').toLowerCase() === 'active'),
    [clients]
  );
  const upcomingReviews = useMemo(
    () =>
      clients.filter((client) => {
        const days = daysUntil(client.next_review_date);
        return days !== null && days >= 0 && days <= 21;
      }),
    [clients]
  );
  const openInvoiceCount = useMemo(
    () =>
      clients.reduce(
        (sum, client) =>
          sum +
          (client.data ?? createEmptyClientData()).invoices.filter(
            (invoice) => invoice.status !== 'Paid'
          ).length,
        0
      ),
    [clients]
  );
  const openInvoiceValue = useMemo(
    () =>
      clients.reduce(
        (sum, client) =>
          sum +
          (client.data ?? createEmptyClientData()).invoices
            .filter((invoice) => invoice.status !== 'Paid')
            .reduce((invoiceSum, invoice) => invoiceSum + invoiceTotal(invoice), 0),
        0
      ),
    [clients]
  );
  const pipelineValue = useMemo(
    () =>
      clients.reduce(
        (sum, client) =>
          sum +
          (client.data ?? createEmptyClientData()).deals
            .filter((deal) => deal.stage !== 'Won' && deal.stage !== 'Lost')
            .reduce((dealSum, deal) => dealSum + Number(deal.value || 0), 0),
        0
      ),
    [clients]
  );

  const filteredClients = useMemo(() => {
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
      if (sortMode === 'company') {
        return (a.company_name ?? '').localeCompare(b.company_name ?? '');
      }

      if (sortMode === 'review') {
        const aDays = daysUntil(a.next_review_date);
        const bDays = daysUntil(b.next_review_date);
        return (aDays ?? Number.MAX_SAFE_INTEGER) - (bDays ?? Number.MAX_SAFE_INTEGER);
      }

      if (sortMode === 'value') {
        const aValue = Number((a.data ?? createEmptyClientData()).estimatedMonthlyValue || 0);
        const bValue = Number((b.data ?? createEmptyClientData()).estimatedMonthlyValue || 0);
        return bValue - aValue;
      }

      if (sortMode === 'attention') {
        const rankClient = (client: ClientRecord) => {
          const data = client.data ?? createEmptyClientData();
          const overdueInvoices = data.invoices.filter((invoice) => invoice.status === 'Overdue')
            .length;
          const reviewDays = daysUntil(client.next_review_date);
          const overdueReviewPenalty = reviewDays !== null && reviewDays < 0 ? Math.abs(reviewDays) + 5 : 0;
          const relationshipPenalty =
            data.relationshipHealth === 'At Risk' ? 10 : data.relationshipHealth === 'Watch' ? 5 : 0;
          const setupPenalty =
            !client.contact_name || !data.accountOwner || !data.profileSummary.trim() ? 3 : 0;

          return overdueInvoices * 20 + overdueReviewPenalty + relationshipPenalty + setupPenalty;
        };

        return rankClient(b) - rankClient(a);
      }

      return getTimestamp(b.updated_at ?? b.created_at) - getTimestamp(a.updated_at ?? a.created_at);
    });
  }, [clients, deferredSearch, sortMode, statusFilter]);

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Clients"
        title="Client list"
        description="Use this page as the working CRM list. Search, filter, and open the right account quickly, then use the dedicated setup page when you need to create a new client."
        actions={
          <>
            <Link className="button button-primary" to="/clients/new">
              Add new client
            </Link>
            <Link className="button button-secondary" to="/dashboard">
              Back to overview
            </Link>
          </>
        }
        side={
          <div className="page-intro-summary">
            <span className="soft-pill">CRM snapshot</span>
            <strong>Live client book</strong>
            <p>{message}</p>
            <div className="page-intro-summary-list">
              <div>
                <span>Accounts</span>
                <strong>{clients.length}</strong>
              </div>
              <div>
                <span>Pipeline</span>
                <strong>{fmtCurrency(pipelineValue)}</strong>
              </div>
              <div>
                <span>Open invoices</span>
                <strong>{openInvoiceCount}</strong>
              </div>
            </div>
          </div>
        }
      />

      <section className="stats-grid">
        <StatCard label="Active clients" value={String(activeClients.length)} hint="Accounts currently in live service" />
        <StatCard label="Review queue" value={String(upcomingReviews.length)} hint="Clients due review within 21 days" />
        <StatCard label="Open invoices" value={String(openInvoiceCount)} hint={fmtCurrency(openInvoiceValue)} />
        <StatCard label="Pipeline value" value={fmtCurrency(pipelineValue)} hint="Estimated value still in play" />
      </section>

      <section className="card-grid two-columns">
        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3>List controls</h3>
              <p>Keep the CRM list tight and easy to work from day to day.</p>
            </div>
            <span className="soft-pill">{filteredClients.length} visible</span>
          </div>

          <div className="stack gap-20">
            <label className="field">
              <span>Search clients</span>
              <input
                className="input"
                placeholder="Search company, contact, email, location, or tag"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="form-grid two-columns">
              <label className="field">
                <span>Status filter</span>
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
                <span>Sort by</span>
                <select
                  className="input"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="attention">Attention needed</option>
                  <option value="updated">Last updated</option>
                  <option value="review">Next review date</option>
                  <option value="value">Estimated monthly value</option>
                  <option value="company">Company name</option>
                </select>
              </label>
            </div>
          </div>
        </article>

        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3>New client setup</h3>
              <p>Client creation now lives on its own page so this screen stays focused on the working CRM list.</p>
            </div>
            <span className="soft-pill">Separate workflow</span>
          </div>

          <div className="stack gap-16">
            <p className="muted-copy">
              Use the dedicated setup page for the business finder, account scope, site planner, registered details, and first CRM summary.
            </p>
            <div className="header-actions">
              <Link className="button button-primary" to="/clients/new">
                Open setup page
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section className="feature-card">
        <div className="feature-top">
          <div>
            <h3>Client CRM list</h3>
            <p>Open the record you need, review alerts quickly, and move straight into billing, audit, or menu work.</p>
          </div>
          <span className="soft-pill">{filteredClients.length} records</span>
        </div>

        <div className="clients-long-list">
          {filteredClients.length === 0 ? (
            <div className="dashboard-empty">
              No clients match the current search or filter settings.
            </div>
          ) : null}

          {filteredClients.map((client) => {
            const data = client.data ?? createEmptyClientData();
            const openTasks = data.tasks.filter((task) => task.status !== 'Done').length;
            const openDeals = data.deals.filter((deal) => deal.stage !== 'Won' && deal.stage !== 'Lost');
            const pipeline = openDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
            const openInvoices = data.invoices.filter((invoice) => invoice.status !== 'Paid');
            const overdueInvoices = data.invoices.filter((invoice) => invoice.status === 'Overdue');
            const outstanding = openInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
            const reviewDelta = daysUntil(client.next_review_date);
            const setupIncomplete =
              !client.contact_name || !data.accountOwner || !data.profileSummary.trim();
            const alerts = [
              overdueInvoices.length
                ? {
                    label: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? '' : 's'}`,
                    tone: 'is-critical'
                  }
                : null,
              reviewDelta !== null && reviewDelta < 0
                ? {
                    label: `Review overdue by ${Math.abs(reviewDelta)} day${Math.abs(reviewDelta) === 1 ? '' : 's'}`,
                    tone: 'is-critical'
                  }
                : null,
              data.relationshipHealth === 'At Risk'
                ? { label: 'Relationship at risk', tone: 'is-critical' }
                : data.relationshipHealth === 'Watch'
                  ? { label: 'Relationship needs watching', tone: 'is-warning' }
                  : null,
              openTasks > 0
                ? {
                    label: `${openTasks} open task${openTasks === 1 ? '' : 's'}`,
                    tone: 'is-warning'
                  }
                : null,
              setupIncomplete ? { label: 'Profile setup incomplete', tone: 'is-warning' } : null
            ].filter(Boolean) as Array<{ label: string; tone: string }>;

            return (
              <article className="crm-client-row" key={client.id}>
                <div className="crm-client-main">
                  <div className="crm-client-heading">
                    <div>
                      <strong>{client.company_name}</strong>
                      <p>
                        {data.accountScope || 'Single site'} • {client.location || 'Location not set'} •{' '}
                        {client.contact_name || 'Main contact not set'}
                      </p>
                    </div>
                    <div className="crm-client-badges">
                      <span className={statusTone(client.status)}>{client.status || 'Active'}</span>
                      <span className={relationshipTone(data.relationshipHealth)}>
                        {data.relationshipHealth}
                      </span>
                    </div>
                  </div>

                  <div className="crm-client-metrics">
                    <div className="crm-metric-card">
                      <span>Account owner</span>
                      <strong>{data.accountOwner || 'Not set'}</strong>
                    </div>
                    <div className="crm-metric-card">
                      <span>Account scope</span>
                      <strong>{data.accountScope}</strong>
                    </div>
                    <div className="crm-metric-card">
                      <span>Next review</span>
                      <strong>{reviewLabel(client.next_review_date)}</strong>
                    </div>
                    <div className="crm-metric-card">
                      <span>Monthly value</span>
                      <strong>{fmtCurrency(Number(data.estimatedMonthlyValue || 0))}</strong>
                    </div>
                    <div className="crm-metric-card">
                      <span>Pipeline</span>
                      <strong>{fmtCurrency(pipeline)}</strong>
                    </div>
                    <div className="crm-metric-card">
                      <span>Open invoices</span>
                      <strong>{openInvoices.length}</strong>
                    </div>
                    <div className="crm-metric-card">
                      <span>Outstanding</span>
                      <strong>{fmtCurrency(outstanding)}</strong>
                    </div>
                    <div className="crm-metric-card">
                      <span>Open tasks</span>
                      <strong>{openTasks}</strong>
                    </div>
                    <div className="crm-metric-card">
                      <span>Sites</span>
                      <strong>{Math.max(data.sites.length, data.siteCountEstimate || 0)}</strong>
                    </div>
                    <div className="crm-metric-card">
                      <span>Updated</span>
                      <strong>{formatShortDate(client.updated_at)}</strong>
                    </div>
                  </div>

                  <p className="crm-client-summary">
                    {data.profileSummary || 'No CRM summary written yet. Open the profile to flesh out strategy, billing, tasks, and invoice detail.'}
                  </p>

                  <div className="crm-alert-row">
                    {alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <span className={`crm-alert-chip ${alert.tone}`} key={alert.label}>
                          {alert.label}
                        </span>
                      ))
                    ) : (
                      <span className="crm-alert-chip is-stable">No active alerts on this account</span>
                    )}
                  </div>

                  <div className="client-tag-row">
                    <span className="soft-pill">{data.operatingCountry || 'United Kingdom'}</span>
                    {data.companyNumber ? <span className="soft-pill">Co. {data.companyNumber}</span> : null}
                    {(client.tags ?? []).slice(0, 5).map((tag) => (
                      <span className="soft-pill" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="crm-client-actions">
                  <Link className="button button-primary" to={`/clients/${client.id}`}>
                    Open CRM
                  </Link>
                  <button className="button button-secondary" onClick={() => handleExportClient(client)}>
                    Export PDF
                  </button>
                  <Link className="button button-ghost" to={`/clients/${client.id}#client-invoices`}>
                    Billing
                  </Link>
                  <Link className="button button-ghost" to={`/audit?client=${client.id}`}>
                    New audit
                  </Link>
                  <Link className="button button-ghost" to={`/menu?client=${client.id}`}>
                    New menu
                  </Link>
                  <button className="button button-ghost danger-text" onClick={() => handleDelete(client.id)}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
