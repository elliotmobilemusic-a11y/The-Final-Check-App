import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildClientPdfHtml, invoiceTotal, openPrintableHtmlDocument } from '../lib/clientExports';
import { clientRecordToProfile, createEmptyClientData } from '../lib/clientData';
import {
  getBusinessProfile,
  searchBusinessProfiles,
  type BusinessLookupProfile,
  type BusinessLookupResult
} from '../lib/businessLookup';
import { fmtCurrency } from '../lib/utils';
import { createClient, deleteClient, listClients } from '../services/clients';
import type { ClientProfile, ClientRecord } from '../types';
import { StatCard } from '../components/StatCard';

const blankClient: ClientProfile = {
  companyName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  location: '',
  notes: '',
  logoUrl: '',
  coverUrl: '',
  status: 'Active',
  tier: 'Standard',
  industry: '',
  website: '',
  nextReviewDate: '',
  tags: [],
  data: createEmptyClientData()
};

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

type SortMode = 'updated' | 'review' | 'value' | 'company' | 'attention';

function mergeLookupIntoClient(current: ClientProfile, lookup: BusinessLookupProfile): ClientProfile {
  const nextTags = [...new Set([lookup.industry, ...current.tags].filter(Boolean))];

  return {
    ...current,
    companyName: lookup.name || current.companyName,
    location: lookup.location || current.location,
    logoUrl: lookup.logoUrl || current.logoUrl,
    coverUrl: lookup.coverUrl || current.coverUrl || lookup.logoUrl,
    industry: lookup.industry || current.industry,
    website: lookup.website || current.website,
    contactPhone: lookup.phone || current.contactPhone,
    tags: nextTags,
    data: {
      ...current.data,
      profileSummary: current.data.profileSummary || lookup.summary,
      billingName: current.data.billingName || lookup.name,
      leadSource: current.data.leadSource || 'AI business search'
    }
  };
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<ClientProfile>(blankClient);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('Client list ready.');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<BusinessLookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState(
    'Use the business finder to search hospitality groups, pub companies, restaurant brands, or websites and pull the best match into the CRM.'
  );
  const [lookupSelectionId, setLookupSelectionId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortMode, setSortMode] = useState<SortMode>('updated');

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.companyName.trim()) {
      setMessage('Please enter a company name.');
      return;
    }

    try {
      setSaving(true);
      await createClient(form);
      setForm({
        ...blankClient,
        data: createEmptyClientData()
      });
      setMessage('Client created and added to the CRM.');
      await refreshClients();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create client.');
    } finally {
      setSaving(false);
    }
  }

  async function handleBusinessLookup() {
    const query = lookupQuery.trim();
    if (query.length < 2) {
      setLookupMessage('Enter at least two characters to search for a business.');
      setLookupResults([]);
      return;
    }

    try {
      setLookupLoading(true);
      setLookupSelectionId('');
      const results = await searchBusinessProfiles(query);
      setLookupResults(results);
      setLookupMessage(
        results.length
          ? `Found ${results.length} business match${results.length === 1 ? '' : 'es'}. Start with the highest-confidence result and review the details before saving.`
          : 'No recognised business matches found. Try the trading name, location, or website.'
      );
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : 'Business lookup failed.');
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleUseLookup(result: BusinessLookupResult) {
    try {
      setLookupLoading(true);
      setLookupSelectionId(result.id);
      const profile = await getBusinessProfile(result);
      setForm((current) => mergeLookupIntoClient(current, profile));
      setLookupMessage(`Loaded details for ${profile.name}. Review the contact and billing fields before saving.`);
      setMessage(`Business details loaded for ${profile.name}.`);
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : 'Could not load business details.');
    } finally {
      setLookupLoading(false);
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
    openPrintableHtmlDocument(
      `${profile.companyName} CRM export`,
      buildClientPdfHtml(profile)
    );
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
  const overdueReviews = useMemo(
    () =>
      clients.filter((client) => {
        const days = daysUntil(client.next_review_date);
        return days !== null && days < 0;
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
            .filter((deal) => deal.stage !== 'Lost')
            .reduce((dealSum, deal) => dealSum + Number(deal.value || 0), 0),
        0
      ),
    [clients]
  );
  const overdueInvoiceCount = useMemo(
    () =>
      clients.reduce(
        (sum, client) =>
          sum +
          (client.data ?? createEmptyClientData()).invoices.filter(
            (invoice) => invoice.status === 'Overdue'
          ).length,
        0
      ),
    [clients]
  );
  const overdueInvoiceValue = useMemo(
    () =>
      clients.reduce(
        (sum, client) =>
          sum +
          (client.data ?? createEmptyClientData()).invoices
            .filter((invoice) => invoice.status === 'Overdue')
            .reduce((invoiceSum, invoice) => invoiceSum + invoiceTotal(invoice), 0),
        0
      ),
    [clients]
  );
  const setupGaps = useMemo(
    () =>
      clients.filter((client) => {
        const data = client.data ?? createEmptyClientData();
        return (
          !client.contact_name ||
          !data.accountOwner ||
          !data.profileSummary.trim() ||
          !client.contact_email
        );
      }),
    [clients]
  );

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

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
          const overdueInvoices = data.invoices.filter((invoice) => invoice.status === 'Overdue').length;
          const reviewDays = daysUntil(client.next_review_date);
          const overdueReviewPenalty = reviewDays !== null && reviewDays < 0 ? Math.abs(reviewDays) + 5 : 0;
          const relationshipPenalty = data.relationshipHealth === 'At Risk' ? 10 : data.relationshipHealth === 'Watch' ? 5 : 0;
          const setupPenalty =
            !client.contact_name || !data.accountOwner || !data.profileSummary.trim() ? 3 : 0;

          return overdueInvoices * 20 + overdueReviewPenalty + relationshipPenalty + setupPenalty;
        };

        return rankClient(b) - rankClient(a);
      }

      return getTimestamp(b.updated_at ?? b.created_at) - getTimestamp(a.updated_at ?? a.created_at);
    });
  }, [clients, search, sortMode, statusFilter]);

  return (
    <div className="page-stack">
      <section className="page-heading clients-hero">
        <div className="clients-hero-grid">
          <div className="clients-hero-copy">
            <div className="brand-badge">CRM and client portfolio</div>
            <h2>Manage the full client book from one clear operational list</h2>
            <p>
              Create new accounts at the top, then use the live client list for reviews,
              pipeline, billing exposure, and linked delivery work.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#client-create-form">
                Add new client
              </a>
              <Link className="button button-secondary" to="/dashboard">
                Back to overview
              </Link>
            </div>

            <div className="clients-hero-chip-row">
              <div className="clients-hero-chip">
                <span>Clients</span>
                <strong>{clients.length}</strong>
                <small>Accounts currently active in the CRM</small>
              </div>
              <div className="clients-hero-chip">
                <span>Pipeline</span>
                <strong>{fmtCurrency(pipelineValue)}</strong>
                <small>Open opportunity value across the client base</small>
              </div>
              <div className="clients-hero-chip">
                <span>Outstanding invoices</span>
                <strong>{openInvoiceCount}</strong>
                <small>{fmtCurrency(openInvoiceValue)} still open across the book</small>
              </div>
            </div>
          </div>

          <div className="clients-focus-card">
            <span className="soft-pill">Operational view</span>
            <h3>One place for client records, delivery history, billing, and follow-up</h3>
            <div className="clients-focus-list">
              <div className="clients-focus-item">
                <strong>CRM visibility</strong>
                <span>Searchable accounts, status filters, relationship health, and account ownership.</span>
              </div>
              <div className="clients-focus-item">
                <strong>Commercial workflow</strong>
                <span>Track pipeline value, invoice exposure, review cadence, and open tasks from the same record.</span>
              </div>
              <div className="clients-focus-item">
                <strong>Fast actions</strong>
                <span>{message}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Active clients" value={String(activeClients.length)} hint="Accounts currently in live service" />
        <StatCard label="Review queue" value={String(upcomingReviews.length)} hint="Clients due review within 21 days" />
        <StatCard label="Open invoices" value={String(openInvoiceCount)} hint={fmtCurrency(openInvoiceValue)} />
        <StatCard label="Pipeline value" value={fmtCurrency(pipelineValue)} hint="Estimated value still in play" />
      </section>

      <section className="crm-priority-grid">
        <article className="crm-priority-card is-critical">
          <span>Immediate attention</span>
          <strong>{overdueReviews.length} overdue review{overdueReviews.length === 1 ? '' : 's'}</strong>
          <small>Accounts that should be followed up now before cadence slips further.</small>
        </article>
        <article className="crm-priority-card is-warning">
          <span>Billing risk</span>
          <strong>
            {overdueInvoiceCount} overdue invoice{overdueInvoiceCount === 1 ? '' : 's'}
          </strong>
          <small>{fmtCurrency(overdueInvoiceValue)} is past due across the current client book.</small>
        </article>
        <article className="crm-priority-card is-stable">
          <span>Setup gaps</span>
          <strong>{setupGaps.length} client record{setupGaps.length === 1 ? '' : 's'}</strong>
          <small>These accounts still need cleaner contact, ownership, or summary detail.</small>
        </article>
      </section>

      <section className="card-grid two-columns clients-top-grid">
        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3 id="client-create-form">Add a new client</h3>
              <p>Create the account once, then use the profile as the CRM, billing, and delivery home.</p>
            </div>
            <span className="soft-pill">New account</span>
          </div>

          <form className="stack gap-20" onSubmit={handleSubmit}>
            <section className="crm-lookup-shell">
              <div className="crm-lookup-top">
                <div>
                  <h4>AI-assisted business finder</h4>
                  <p className="muted-copy">
                    Search across venue and company data, then pull in the strongest public match
                    with website, location, logo, industry, and contact signals before you save.
                  </p>
                </div>
                <span className="soft-pill">Smart enrichment</span>
              </div>

              <div className="crm-lookup-bar">
                <label className="field">
                  <span>Business name search</span>
                  <input
                    className="input"
                    placeholder="Search by venue, group, brand, or website"
                    value={lookupQuery}
                    onChange={(event) => setLookupQuery(event.target.value)}
                  />
                </label>
                <button
                  className="button button-secondary self-end"
                  disabled={lookupLoading}
                  onClick={handleBusinessLookup}
                  type="button"
                >
                  {lookupLoading ? 'Searching...' : 'Find business'}
                </button>
              </div>

              <p className="muted-copy">{lookupMessage}</p>

              {lookupResults.length ? (
                <div className="crm-lookup-results">
                  {lookupResults.map((result) => (
                    <article className="crm-lookup-card" key={result.id}>
                      <div className="crm-lookup-card-top">
                        <div className="crm-lookup-logo-shell">
                          {result.logoUrl ? (
                            <img alt={`${result.name} logo`} className="crm-lookup-logo" src={result.logoUrl} />
                          ) : (
                            <span className="crm-lookup-logo-fallback">
                              {result.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="stack gap-12">
                          <div>
                            <strong>{result.name}</strong>
                            <p className="crm-lookup-description">
                              {result.description || 'Public business profile recognised.'}
                            </p>
                          </div>

                          <div className="crm-lookup-meta-row">
                            <span className="crm-lookup-confidence">{result.confidenceLabel}</span>
                            <span className="crm-alert-chip">
                              {result.resultType === 'group' ? 'Group or brand' : 'Site or venue'}
                            </span>
                            <span className="crm-alert-chip">{result.sourceLabel}</span>
                            {result.phone ? <span className="crm-alert-chip">{result.phone}</span> : null}
                          </div>

                          <div className="crm-alert-row">
                            {result.industry ? (
                              <span className="crm-alert-chip is-stable">{result.industry}</span>
                            ) : null}
                            {result.location ? (
                              <span className="crm-alert-chip is-warning">{result.location}</span>
                            ) : null}
                            {result.website ? (
                              <span className="crm-alert-chip">{result.website.replace(/^https?:\/\//, '')}</span>
                            ) : null}
                          </div>

                          {result.signals.length ? (
                            <p className="crm-lookup-note">{result.signals.join(' • ')}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="saved-actions">
                        <button
                          className="button button-primary"
                          disabled={lookupLoading}
                          onClick={() => handleUseLookup(result)}
                          type="button"
                        >
                          {lookupSelectionId === result.id && lookupLoading ? 'Loading...' : 'Apply match'}
                        </button>
                        <a
                          className="button button-ghost"
                          href={result.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Source
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="form-grid">
              <label className="field">
                <span>Company name</span>
                <input
                  className="input"
                  value={form.companyName}
                  onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                />
              </label>

              <label className="field">
                <span>Main contact</span>
                <input
                  className="input"
                  value={form.contactName}
                  onChange={(event) => setForm({ ...form, contactName: event.target.value })}
                />
              </label>

              <label className="field">
                <span>Contact email</span>
                <input
                  className="input"
                  value={form.contactEmail}
                  onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                />
              </label>

              <label className="field">
                <span>Location</span>
                <input
                  className="input"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  className="input"
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                >
                  <option>Active</option>
                  <option>Prospect</option>
                  <option>Onboarding</option>
                  <option>Paused</option>
                  <option>Completed</option>
                </select>
              </label>

              <label className="field">
                <span>Account owner</span>
                <input
                  className="input"
                  value={form.data.accountOwner}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: {
                        ...form.data,
                        accountOwner: event.target.value
                      }
                    })
                  }
                />
              </label>
            </div>

            <div className="form-grid three-balance">
              <label className="field">
                <span>Review date</span>
                <input
                  className="input"
                  type="date"
                  value={form.nextReviewDate}
                  onChange={(event) => setForm({ ...form, nextReviewDate: event.target.value })}
                />
              </label>

              <label className="field">
                <span>Estimated monthly value</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.data.estimatedMonthlyValue}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: {
                        ...form.data,
                        estimatedMonthlyValue: Number(event.target.value)
                      }
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Lead source</span>
                <input
                  className="input"
                  value={form.data.leadSource}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: {
                        ...form.data,
                        leadSource: event.target.value
                      }
                    })
                  }
                />
              </label>
            </div>

            <label className="field">
              <span>Profile summary</span>
              <textarea
                className="input textarea"
                value={form.data.profileSummary}
                onChange={(event) =>
                  setForm({
                    ...form,
                    data: {
                      ...form.data,
                      profileSummary: event.target.value
                    }
                  })
                }
              />
            </label>

            <div className="form-grid two-columns">
              <label className="field">
                <span>Website</span>
                <input
                  className="input"
                  value={form.website}
                  onChange={(event) => setForm({ ...form, website: event.target.value })}
                />
              </label>

              <label className="field">
                <span>Logo image URL</span>
                <input
                  className="input"
                  value={form.logoUrl}
                  onChange={(event) => setForm({ ...form, logoUrl: event.target.value })}
                />
              </label>
            </div>

            <div className="header-actions">
              <button className="button button-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Create client'}
              </button>
            </div>
          </form>
        </article>

        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3>Portfolio controls</h3>
              <p>Filter the CRM like a working client book, not a static address list.</p>
            </div>
            <span className="soft-pill">List controls</span>
          </div>

          <div className="stack gap-16">
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

            <div className="crm-summary-grid">
              <div className="crm-summary-card">
                <span>Visible results</span>
                <strong>{filteredClients.length}</strong>
                <small>Clients matching the current search and filter state</small>
              </div>
              <div className="crm-summary-card">
                <span>Upcoming reviews</span>
                <strong>{upcomingReviews.length}</strong>
                <small>Next scheduled relationship checkpoints</small>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="feature-card">
        <div className="feature-top">
          <div>
            <h3>Client CRM list</h3>
            <p>A long-form operational list with quick visibility into relationship, delivery, billing, and pipeline.</p>
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
                        {client.industry || 'Industry not set'} • {client.location || 'Location not set'} •{' '}
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
