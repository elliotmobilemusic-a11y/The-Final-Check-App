import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import {
  buildClientPdfHtml,
  invoiceTotal,
  openPrintableHtmlDocument
} from '../../features/clients/clientExports';
import { clientRecordToProfile, createEmptyClientData } from '../../features/clients/clientData';
import { fmtCurrency } from '../../lib/utils';
import { createClientIntakeShare } from '../../services/clientIntakeShares';
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
  const [intakeUrl, setIntakeUrl] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortMode, setSortMode] = useState<SortMode>('attention');
  const [clientPendingDelete, setClientPendingDelete] = useState<ClientRecord | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

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

  function handleExportClient(record: ClientRecord) {
    const profile = clientRecordToProfile(record);
    openPrintableHtmlDocument(`${profile.companyName} CRM export`, buildClientPdfHtml(profile));
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
      // DO NOT logout user on API failure
      const errorText = error instanceof Error ? error.message : 'Could not create the enquiry link.';
      setMessage(errorText);
      console.warn('Enquiry link creation failed:', error);
    }
  }

  const activeClients = useMemo(
    () => clients.filter((client) => (client.status ?? 'Active').toLowerCase() === 'active'),
    [clients]
  );

  const categorisedClients = useMemo(() => {
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

    // Split clients into clean categories
    const attention: ClientRecord[] = [];
    const active: ClientRecord[] = [];
    const prospects: ClientRecord[] = [];
    const archived: ClientRecord[] = [];

    filtered.forEach(client => {
      const data = client.data ?? createEmptyClientData();
      const status = (client.status ?? 'Active').toLowerCase();
      const reviewDays = daysUntil(client.next_review_date);
      
      const needsAttention = 
        data.relationshipHealth === 'At Risk' ||
        (reviewDays !== null && reviewDays < 0) ||
        data.invoices.some(i => i.status === 'Overdue');

      if (needsAttention && status === 'active') {
        attention.push(client);
      } else if (status === 'active') {
        active.push(client);
      } else if (status === 'prospect' || status === 'onboarding') {
        prospects.push(client);
      } else {
        archived.push(client);
      }
    });

    // Sort each category
    const sortList = (list: ClientRecord[]) => {
      return list.sort((a, b) => {
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
        return getTimestamp(b.updated_at ?? b.created_at) - getTimestamp(a.updated_at ?? a.created_at);
      });
    };

    return {
      attention: sortList(attention),
      active: sortList(active),
      prospects: sortList(prospects),
      archived: sortList(archived),
      total: filtered.length
    };
  }, [clients, deferredSearch, sortMode, statusFilter]);

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Clients"
        title="Client book"
        description="Keep this page as a clean operating list so you can find the right account and open it quickly."
      >
        <div className="page-inline-note">{activeClients.length} active accounts</div>
        <div className="page-inline-note">{categorisedClients.total} visible</div>
        <div className="page-inline-note">{message}</div>
      </PageIntro>

      <section className="panel">
        <div className="panel-body stack gap-20">
          <div className="crm-list-top crm-list-top-compact">
            <div>
              <h3>Clients</h3>
              <p>Open the account you need and move straight into the record.</p>
            </div>
            <div className="crm-list-top-meta">
              <button className="button button-ghost" onClick={handleCreateIntakeLink} type="button">
                Enquiry link
              </button>
              <Link
                aria-label="Add client"
                className="crm-add-button"
                title="Add client"
                to="/clients/new"
              >
                +
              </Link>
            </div>
          </div>

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
                <option value="attention">Attention needed</option>
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

          {categorisedClients.total === 0 ? (
            <div className="dashboard-empty" style={{ padding: '48px 20px' }}>
              No clients match the current search or filter settings.
            </div>
          ) : (
            <>
              {/* Attention Required Section */}
              {categorisedClients.attention.length > 0 && (
                <div className="client-category-section">
                  <div className="client-category-header">
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      <span style={{ color: '#a76060', fontSize: '18px' }}>⚠️</span>
                      Attention Required
                      <span className="status-pill status-danger">{categorisedClients.attention.length}</span>
                    </h4>
                  </div>
                  <div className="clients-long-list" style={{ gap: '12px', marginTop: '12px' }}>
                    {categorisedClients.attention.map((client) => {
                      const data = client.data ?? createEmptyClientData();
                      return (
                        <article className="crm-client-row crm-client-row-simple" key={client.id} style={{ borderLeft: '3px solid #a76060' }}>
                          <div className="crm-client-simple-main">
                            <div className="crm-client-heading crm-client-heading-simple">
                              <div>
                                <strong>{client.company_name}</strong>
                                <p>
                                  {client.location || 'Location not set'}
                                  {client.contact_name ? ` • ${client.contact_name}` : ''}
                                </p>
                              </div>
                              <div className="crm-client-badges">
                                <span className={statusTone(client.status)}>{client.status || 'Active'}</span>
                                <span className={relationshipTone(data.relationshipHealth)}>
                                  {data.relationshipHealth}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="crm-client-actions crm-client-actions-simple">
                            <Link className="button button-primary" to={`/clients/${client.id}`}>
                              Open
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
                </div>
              )}

              {/* Active Clients Section */}
              {categorisedClients.active.length > 0 && (
                <div className="client-category-section" style={{ marginTop: '32px' }}>
                  <div className="client-category-header">
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      <span style={{ color: '#4f8e67', fontSize: '18px' }}>✓</span>
                      Active Clients
                      <span className="status-pill status-success">{categorisedClients.active.length}</span>
                    </h4>
                  </div>
                  <div className="clients-long-list" style={{ gap: '12px', marginTop: '12px' }}>
                    {categorisedClients.active.map((client) => {
                      const data = client.data ?? createEmptyClientData();
                      return (
                        <article className="crm-client-row crm-client-row-simple" key={client.id}>
                          <div className="crm-client-simple-main">
                            <div className="crm-client-heading crm-client-heading-simple">
                              <div>
                                <strong>{client.company_name}</strong>
                                <p>
                                  {client.location || 'Location not set'}
                                  {client.contact_name ? ` • ${client.contact_name}` : ''}
                                </p>
                              </div>
                              <div className="crm-client-badges">
                                <span className={statusTone(client.status)}>{client.status || 'Active'}</span>
                                <span className={relationshipTone(data.relationshipHealth)}>
                                  {data.relationshipHealth}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="crm-client-actions crm-client-actions-simple">
                            <Link className="button button-primary" to={`/clients/${client.id}`}>
                              Open
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
                </div>
              )}

              {/* Prospects & Onboarding Section */}
              {categorisedClients.prospects.length > 0 && (
                <div className="client-category-section" style={{ marginTop: '32px' }}>
                  <div className="client-category-header">
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      <span style={{ color: '#c6a161', fontSize: '18px' }}>📥</span>
                      Prospects & Onboarding
                      <span className="status-pill status-warning">{categorisedClients.prospects.length}</span>
                    </h4>
                  </div>
                  <div className="clients-long-list" style={{ gap: '12px', marginTop: '12px' }}>
                    {categorisedClients.prospects.map((client) => {
                      const data = client.data ?? createEmptyClientData();
                      return (
                        <article className="crm-client-row crm-client-row-simple" key={client.id} style={{ opacity: 0.88 }}>
                          <div className="crm-client-simple-main">
                            <div className="crm-client-heading crm-client-heading-simple">
                              <div>
                                <strong>{client.company_name}</strong>
                                <p>
                                  {client.location || 'Location not set'}
                                  {client.contact_name ? ` • ${client.contact_name}` : ''}
                                </p>
                              </div>
                              <div className="crm-client-badges">
                                <span className={statusTone(client.status)}>{client.status || 'Active'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="crm-client-actions crm-client-actions-simple">
                            <Link className="button button-primary" to={`/clients/${client.id}`}>
                              Open
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
                </div>
              )}

              {/* Archived Section */}
              {categorisedClients.archived.length > 0 && (
                <div className="client-category-section" style={{ marginTop: '32px' }}>
                  <div className="client-category-header">
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#726c67' }}>
                      <span style={{ fontSize: '18px' }}>⏸️</span>
                      Paused / Completed
                      <span className="status-pill" style={{ background: 'var(--line)', color: 'var(--text)' }}>{categorisedClients.archived.length}</span>
                    </h4>
                  </div>
                  <div className="clients-long-list" style={{ gap: '12px', marginTop: '12px', opacity: 0.7 }}>
                    {categorisedClients.archived.map((client) => {
                      const data = client.data ?? createEmptyClientData();
                      return (
                        <article className="crm-client-row crm-client-row-simple" key={client.id}>
                          <div className="crm-client-simple-main">
                            <div className="crm-client-heading crm-client-heading-simple">
                              <div>
                                <strong>{client.company_name}</strong>
                                <p>
                                  {client.location || 'Location not set'}
                                  {client.contact_name ? ` • ${client.contact_name}` : ''}
                                </p>
                              </div>
                              <div className="crm-client-badges">
                                <span className={statusTone(client.status)}>{client.status || 'Active'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="crm-client-actions crm-client-actions-simple">
                            <Link className="button button-primary" to={`/clients/${client.id}`}>
                              Open
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
                </div>
              )}
            </>
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
