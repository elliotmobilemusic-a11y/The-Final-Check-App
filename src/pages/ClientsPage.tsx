import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  data: {
    profileSummary: '',
    goals: [],
    risks: [],
    opportunities: [],
    internalNotes: '',
    contacts: [],
    sites: [],
    timeline: [],
    tasks: []
  }
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

function statusTone(status?: string | null) {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'active') return 'status-pill status-success';
  if (normalized === 'prospect' || normalized === 'onboarding') {
    return 'status-pill status-warning';
  }

  return 'status-pill status-danger';
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<ClientProfile>(blankClient);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('Client hub ready.');

  useEffect(() => {
    refreshClients();
  }, []);

  async function refreshClients() {
    try {
      const rows = await listClients();
      setClients(
        [...rows].sort(
          (a, b) => getTimestamp(b.updated_at ?? b.created_at) - getTimestamp(a.updated_at ?? a.created_at)
        )
      );
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
      setForm(blankClient);
      setMessage('Client created.');
      await refreshClients();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create client.');
    } finally {
      setSaving(false);
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

  const activeClients = clients.filter(
    (client) => (client.status ?? 'Active').toLowerCase() === 'active'
  );
  const upcomingReviews = clients.filter((client) => {
    const days = daysUntil(client.next_review_date);
    return days !== null && days >= 0 && days <= 21;
  });
  const onboardingClients = clients.filter((client) => {
    const normalized = (client.status ?? '').toLowerCase();
    return normalized === 'prospect' || normalized === 'onboarding';
  });

  return (
    <div className="page-stack">
      <section className="page-heading clients-hero">
        <div className="clients-hero-grid">
          <div className="clients-hero-copy">
            <div className="brand-badge">Client portfolio</div>
            <h2>Build a sharper client operating layer for every engagement</h2>
            <p>
              Create the business record first, then keep audits, menu reviews, contacts,
              review dates, and follow-up work anchored to that account instead of scattered
              across the system.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#client-create-form">
                Create client profile
              </a>
              <Link className="button button-secondary" to="/dashboard">
                Open dashboard
              </Link>
            </div>

            <div className="clients-hero-chip-row">
              <div className="clients-hero-chip">
                <span>Portfolio</span>
                <strong>{clients.length}</strong>
                <small>Client records currently in the workspace</small>
              </div>
              <div className="clients-hero-chip">
                <span>Active</span>
                <strong>{activeClients.length}</strong>
                <small>Businesses already live and in motion</small>
              </div>
              <div className="clients-hero-chip">
                <span>Review queue</span>
                <strong>{upcomingReviews.length}</strong>
                <small>Accounts due review in the next 21 days</small>
              </div>
            </div>
          </div>

          <div className="clients-focus-card">
            <span className="soft-pill">Operating focus</span>
            <h3>One profile should hold the full commercial relationship</h3>
            <div className="clients-focus-list">
              <div className="clients-focus-item">
                <strong>Account setup</strong>
                <span>Capture contact detail, review cadence, tier, status, and commercial context up front.</span>
              </div>
              <div className="clients-focus-item">
                <strong>Delivery linkage</strong>
                <span>Keep audits and menu work attached to the client record so the history stays usable.</span>
              </div>
              <div className="clients-focus-item">
                <strong>Follow-up visibility</strong>
                <span>{message}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Clients" value={String(clients.length)} hint="Profiles in the portfolio" />
        <StatCard label="Active" value={String(activeClients.length)} hint="Live retained or current accounts" />
        <StatCard label="Onboarding" value={String(onboardingClients.length)} hint="Prospects and new client setup" />
        <StatCard label="Review queue" value={String(upcomingReviews.length)} hint={message} />
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 id="client-create-form">New client profile</h3>
                <p className="muted-copy">Record the business properly before you create delivery work.</p>
              </div>
            </div>

            <div className="panel-body">
              <form className="stack gap-20" onSubmit={handleSubmit}>
                <div className="stack gap-16">
                  <div className="section-kicker">Client essentials</div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Company name</span>
                      <input
                        className="input"
                        value={form.companyName}
                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>Contact name</span>
                      <input
                        className="input"
                        value={form.contactName}
                        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>Contact email</span>
                      <input
                        className="input"
                        value={form.contactEmail}
                        onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>Contact phone</span>
                      <input
                        className="input"
                        value={form.contactPhone}
                        onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>Location</span>
                      <input
                        className="input"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>Industry</span>
                      <input
                        className="input"
                        value={form.industry}
                        onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-grid three-balance">
                  <label className="field">
                    <span>Status</span>
                    <select
                      className="input"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option>Active</option>
                      <option>Prospect</option>
                      <option>Onboarding</option>
                      <option>Paused</option>
                      <option>Completed</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Tier</span>
                    <select
                      className="input"
                      value={form.tier}
                      onChange={(e) => setForm({ ...form, tier: e.target.value })}
                    >
                      <option>Standard</option>
                      <option>Growth</option>
                      <option>Premium</option>
                      <option>Enterprise</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Next review date</span>
                    <input
                      className="input"
                      type="date"
                      value={form.nextReviewDate}
                      onChange={(e) => setForm({ ...form, nextReviewDate: e.target.value })}
                    />
                  </label>
                </div>

                <div className="form-grid two-columns">
                  <label className="field">
                    <span>Website</span>
                    <input
                      className="input"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Tags (one per line)</span>
                    <textarea
                      className="input textarea"
                      value={form.tags.join('\n')}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tags: e.target.value
                            .split('\n')
                            .map((item) => item.trim())
                            .filter(Boolean)
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
                    onChange={(e) =>
                      setForm({
                        ...form,
                        data: {
                          ...form.data,
                          profileSummary: e.target.value
                        }
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Notes</span>
                  <textarea
                    className="input textarea"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </label>

                <div className="header-actions">
                  <button className="button button-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Create client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <aside className="workspace-side">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Portfolio pulse</h3>
                <p className="muted-copy">A quick view of who needs attention before you open the full profile.</p>
              </div>
            </div>

            <div className="panel-body stack gap-12">
              <div className="clients-pulse-row">
                <span>Active accounts</span>
                <strong>{activeClients.length}</strong>
              </div>
              <div className="clients-pulse-row">
                <span>Upcoming reviews</span>
                <strong>{upcomingReviews.length}</strong>
              </div>
              <div className="clients-pulse-row">
                <span>Onboarding pipeline</span>
                <strong>{onboardingClients.length}</strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Client profiles</h3>
                <p className="muted-copy">Open a client to see the full account, linked audits, menu work, and follow-up.</p>
              </div>
            </div>

            <div className="panel-body stack gap-12">
              {clients.length === 0 ? <div className="muted-copy">No clients created yet.</div> : null}

              {clients.map((client) => (
                <div className="client-portfolio-card" key={client.id}>
                  <div className="client-portfolio-top">
                    <div>
                      <strong>{client.company_name}</strong>
                      <div className="saved-meta">
                        {client.location || 'No location'} • {client.contact_name || 'No contact'}
                      </div>
                    </div>
                    <span className={statusTone(client.status)}>{client.status || 'Active'}</span>
                  </div>

                  <div className="client-portfolio-meta">
                    <div>
                      <span>Tier</span>
                      <strong>{client.tier || 'Standard'}</strong>
                    </div>
                    <div>
                      <span>Next review</span>
                      <strong>{formatShortDate(client.next_review_date)}</strong>
                    </div>
                  </div>

                  {client.data?.profileSummary ? (
                    <p className="muted-copy">{client.data.profileSummary}</p>
                  ) : (
                    <p className="muted-copy">No summary written yet. Open the client to build out the account view.</p>
                  )}

                  <div className="saved-actions">
                    <Link className="button button-ghost" to={`/clients/${client.id}`}>
                      Open
                    </Link>
                    <button
                      className="button button-ghost danger-text"
                      onClick={() => handleDelete(client.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
