import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { getClientById, updateClient } from '../services/clients';
import { listAudits } from '../services/audits';
import { listMenuProjects } from '../services/menus';
import type {
  AuditFormState,
  ClientContact,
  ClientProfile,
  ClientProfileData,
  ClientRecord,
  ClientSite,
  ClientTask,
  ClientTimelineItem,
  MenuProjectState,
  SupabaseRecord
} from '../types';
import { safe, uid } from '../lib/utils';

const emptyData: ClientProfileData = {
  profileSummary: '',
  goals: [],
  risks: [],
  opportunities: [],
  internalNotes: '',
  contacts: [],
  sites: [],
  timeline: [],
  tasks: []
};

function toProfile(record: ClientRecord): ClientProfile {
  return {
    id: record.id,
    companyName: record.company_name ?? '',
    contactName: record.contact_name ?? '',
    contactEmail: record.contact_email ?? '',
    contactPhone: record.contact_phone ?? '',
    location: record.location ?? '',
    notes: record.notes ?? '',
    logoUrl: record.logo_url ?? '',
    coverUrl: record.cover_url ?? '',
    status: record.status ?? 'Active',
    tier: record.tier ?? 'Standard',
    industry: record.industry ?? '',
    website: record.website ?? '',
    nextReviewDate: record.next_review_date ?? '',
    tags: record.tags ?? [],
    data: record.data ?? emptyData,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[]) {
  return values.join('\n');
}

function blankContact(): ClientContact {
  return {
    id: uid('contact'),
    name: '',
    role: '',
    email: '',
    phone: '',
    isPrimary: false,
    notes: ''
  };
}

function blankSite(): ClientSite {
  return {
    id: uid('site'),
    name: '',
    address: '',
    status: 'Active',
    notes: ''
  };
}

function blankTimeline(): ClientTimelineItem {
  return {
    id: uid('timeline'),
    date: '',
    type: 'Note',
    title: '',
    summary: ''
  };
}

function blankTask(): ClientTask {
  return {
    id: uid('task'),
    title: '',
    dueDate: '',
    owner: '',
    status: 'Open'
  };
}

export function ClientProfilePage() {
  const { clientId = '' } = useParams();

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ClientProfile | null>(null);
  const [audits, setAudits] = useState<SupabaseRecord<AuditFormState>[]>([]);
  const [menus, setMenus] = useState<SupabaseRecord<MenuProjectState>[]>([]);
  const [message, setMessage] = useState('Ready');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [clientRow, auditRows, menuRows] = await Promise.all([
        getClientById(clientId),
        listAudits(clientId),
        listMenuProjects(clientId)
      ]);

      if (!clientRow) return;

      const profile = toProfile(clientRow);
      setClient(profile);
      setForm(profile);
      setAudits(auditRows);
      setMenus(menuRows);
    }

    if (clientId) {
      load().catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Could not load client.');
      });
    }
  }, [clientId]);

  const stats = useMemo(() => {
    if (!client) {
      return {
        contacts: 0,
        sites: 0,
        tasksOpen: 0,
        timeline: 0
      };
    }

    return {
      contacts: client.data.contacts.length,
      sites: client.data.sites.length,
      tasksOpen: client.data.tasks.filter((task) => task.status !== 'Done').length,
      timeline: client.data.timeline.length
    };
  }, [client]);

  if (!client || !form) {
    return (
      <div className="screen-center">
        <div className="loading-card">
          <h2>Loading client profile...</h2>
          <p>{message}</p>
        </div>
      </div>
    );
  }

  function updateField<K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateData<K extends keyof ClientProfileData>(
    key: K,
    value: ClientProfileData[K]
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              [key]: value
            }
          }
        : current
    );
  }

  function updateContact(id: string, key: keyof ClientContact, value: string | boolean) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            contacts: current.data.contacts.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

function updateSite(id: string, key: keyof ClientSite, value: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            sites: current.data.sites.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

function updateTimeline(id: string, key: keyof ClientTimelineItem, value: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            timeline: current.data.timeline.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

function updateTask(id: string, key: keyof ClientTask, value: string) {
  setForm((current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            tasks: current.data.tasks.map((item) =>
              item.id === id ? { ...item, [key]: value } : item
            )
          }
        }
      : current
  );
}

  async function handleSave() {
  if (!client?.id || !form) return;

  try {
    setSaving(true);
    const updated = await updateClient(client.id, form);
    const next = toProfile(updated);
    setClient(next);
    setForm(next);
    setEditing(false);
    setMessage('Client profile updated.');
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'Could not save client.');
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="page-stack">
      <section
        className="client-cover"
        style={{
          backgroundImage: form.coverUrl
            ? `linear-gradient(rgba(30,30,35,.42), rgba(30,30,35,.52)), url(${form.coverUrl})`
            : 'linear-gradient(135deg, #4b4950 0%, #605b65 100%)'
        }}
      >
        <div className="client-cover-inner">
          <div className="client-brand-row">
            <div className="client-logo-shell">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt={form.companyName} className="client-logo-lg" />
              ) : (
                <div className="client-logo-fallback">
                  {safe(form.companyName).slice(0, 2).toUpperCase() || 'CL'}
                </div>
              )}
            </div>

            <div className="client-brand-copy">
              <div className="brand-badge">{form.status}</div>
              <h2>{form.companyName}</h2>
              <p>
                {form.industry || 'Industry not set'} • {form.location || 'Location not set'} •{' '}
                {form.tier || 'Standard'}
              </p>
              <div className="client-tag-row">
                {form.tags.map((tag) => (
                  <span className="soft-pill" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="hero-actions">
            <button
              className="button button-secondary"
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? 'Close edit mode' : 'Edit profile'}
            </button>
            <button
              className="button button-primary"
              disabled={!editing || saving}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
            <Link className="button button-secondary" to={`/audit?client=${client.id}`}>
              New audit
            </Link>
            <Link className="button button-secondary" to={`/menu?client=${client.id}`}>
              New menu
            </Link>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Contacts" value={String(stats.contacts)} hint="Key people" />
        <StatCard label="Sites" value={String(stats.sites)} hint="Locations and venues" />
        <StatCard label="Open tasks" value={String(stats.tasksOpen)} hint="Follow-up actions" />
        <StatCard label="Timeline items" value={String(stats.timeline)} hint="Client history" />
      </section>

      <section className="workspace-grid client-workspace">
        <div className="workspace-main">
          <div className="card-grid two-columns">
            <article className="feature-card">
              <div className="feature-top">
                <div>
                  <h3>Core profile</h3>
                  <p>Primary business information for this client.</p>
                </div>
              </div>

              <div className="form-grid two-columns">
                <label className="field">
                  <span>Company name</span>
                  <input
                    className="input"
                    value={form.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    disabled={!editing}
                  />
                </label>
                <label className="field">
                  <span>Industry</span>
                  <input
                    className="input"
                    value={form.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    disabled={!editing}
                  />
                </label>
                <label className="field">
                  <span>Status</span>
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value)}
                    disabled={!editing}
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
                    onChange={(e) => updateField('tier', e.target.value)}
                    disabled={!editing}
                  >
                    <option>Standard</option>
                    <option>Growth</option>
                    <option>Premium</option>
                    <option>Enterprise</option>
                  </select>
                </label>
                <label className="field">
                  <span>Website</span>
                  <input
                    className="input"
                    value={form.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    disabled={!editing}
                  />
                </label>
                <label className="field">
                  <span>Next review date</span>
                  <input
                    className="input"
                    type="date"
                    value={form.nextReviewDate}
                    onChange={(e) => updateField('nextReviewDate', e.target.value)}
                    disabled={!editing}
                  />
                </label>
                <label className="field">
                  <span>Logo image URL</span>
                  <input
                    className="input"
                    value={form.logoUrl}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                    disabled={!editing}
                  />
                </label>
                <label className="field">
                  <span>Cover image URL</span>
                  <input
                    className="input"
                    value={form.coverUrl}
                    onChange={(e) => updateField('coverUrl', e.target.value)}
                    disabled={!editing}
                  />
                </label>
              </div>

              <label className="field">
                <span>Profile summary</span>
                <textarea
                  className="input textarea"
                  value={form.data.profileSummary}
                  onChange={(e) => updateData('profileSummary', e.target.value)}
                  disabled={!editing}
                />
              </label>
            </article>

            <article className="feature-card">
              <div className="feature-top">
                <div>
                  <h3>Main relationship details</h3>
                  <p>The core contact details you use most often.</p>
                </div>
              </div>

              <div className="form-grid two-columns">
                <label className="field">
                  <span>Main contact</span>
                  <input
                    className="input"
                    value={form.contactName}
                    onChange={(e) => updateField('contactName', e.target.value)}
                    disabled={!editing}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    className="input"
                    value={form.contactEmail}
                    onChange={(e) => updateField('contactEmail', e.target.value)}
                    disabled={!editing}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    className="input"
                    value={form.contactPhone}
                    onChange={(e) => updateField('contactPhone', e.target.value)}
                    disabled={!editing}
                  />
                </label>
                <label className="field">
                  <span>Location</span>
                  <input
                    className="input"
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    disabled={!editing}
                  />
                </label>
              </div>

              <label className="field">
                <span>Tags (one per line)</span>
                <textarea
                  className="input textarea"
                  value={joinLines(form.tags)}
                  onChange={(e) => updateField('tags', splitLines(e.target.value))}
                  disabled={!editing}
                />
              </label>
            </article>
          </div>

          <article className="feature-card">
            <div className="feature-top">
              <div>
                <h3>Goals, risks and opportunities</h3>
                <p>This turns the client profile into a real account strategy view.</p>
              </div>
            </div>

            <div className="form-grid two-columns">
              <label className="field">
                <span>Goals</span>
                <textarea
                  className="input textarea"
                  value={joinLines(form.data.goals)}
                  onChange={(e) => updateData('goals', splitLines(e.target.value))}
                  disabled={!editing}
                />
              </label>
              <label className="field">
                <span>Risks</span>
                <textarea
                  className="input textarea"
                  value={joinLines(form.data.risks)}
                  onChange={(e) => updateData('risks', splitLines(e.target.value))}
                  disabled={!editing}
                />
              </label>
              <label className="field">
                <span>Opportunities</span>
                <textarea
                  className="input textarea"
                  value={joinLines(form.data.opportunities)}
                  onChange={(e) => updateData('opportunities', splitLines(e.target.value))}
                  disabled={!editing}
                />
              </label>
              <label className="field">
                <span>Internal notes</span>
                <textarea
                  className="input textarea"
                  value={form.data.internalNotes}
                  onChange={(e) => updateData('internalNotes', e.target.value)}
                  disabled={!editing}
                />
              </label>
            </div>
          </article>

          <article className="feature-card">
            <div className="feature-top">
              <div>
                <h3>Key contacts</h3>
                <p>Keep more than one decision-maker on the profile.</p>
              </div>
              {editing ? (
                <button
                  className="button button-secondary"
                  onClick={() => updateData('contacts', [...form.data.contacts, blankContact()])}
                >
                  Add contact
                </button>
              ) : null}
            </div>

            <div className="stack gap-12">
              {form.data.contacts.map((contact) => (
                <div className="repeat-card" key={contact.id}>
                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Name</span>
                      <input
                        className="input"
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Role</span>
                      <input
                        className="input"
                        value={contact.role}
                        onChange={(e) => updateContact(contact.id, 'role', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input
                        className="input"
                        value={contact.email}
                        onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Phone</span>
                      <input
                        className="input"
                        value={contact.phone}
                        onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="feature-card">
            <div className="feature-top">
              <div>
                <h3>Sites / locations</h3>
                <p>Useful when one client has multiple venues or kitchens.</p>
              </div>
              {editing ? (
                <button
                  className="button button-secondary"
                  onClick={() => updateData('sites', [...form.data.sites, blankSite()])}
                >
                  Add site
                </button>
              ) : null}
            </div>

            <div className="stack gap-12">
              {form.data.sites.map((site) => (
                <div className="repeat-card" key={site.id}>
                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Site name</span>
                      <input
                        className="input"
                        value={site.name}
                        onChange={(e) => updateSite(site.id, 'name', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <input
                        className="input"
                        value={site.status}
                        onChange={(e) => updateSite(site.id, 'status', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Address</span>
                    <input
                      className="input"
                      value={site.address}
                      onChange={(e) => updateSite(site.id, 'address', e.target.value)}
                      disabled={!editing}
                    />
                  </label>
                </div>
              ))}
            </div>
          </article>

          <article className="feature-card">
            <div className="feature-top">
              <div>
                <h3>Timeline</h3>
                <p>A live history of visits, reviews, calls, milestones and notes.</p>
              </div>
              {editing ? (
                <button
                  className="button button-secondary"
                  onClick={() => updateData('timeline', [...form.data.timeline, blankTimeline()])}
                >
                  Add event
                </button>
              ) : null}
            </div>

            <div className="stack gap-12">
              {form.data.timeline.map((item) => (
                <div className="repeat-card" key={item.id}>
                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Date</span>
                      <input
                        className="input"
                        type="date"
                        value={item.date}
                        onChange={(e) => updateTimeline(item.id, 'date', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Type</span>
                      <select
                        className="input"
                        value={item.type}
                        onChange={(e) => updateTimeline(item.id, 'type', e.target.value)}
                        disabled={!editing}
                      >
                        <option>Visit</option>
                        <option>Audit</option>
                        <option>Menu Review</option>
                        <option>Call</option>
                        <option>Email</option>
                        <option>Task</option>
                        <option>Note</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>Title</span>
                    <input
                      className="input"
                      value={item.title}
                      onChange={(e) => updateTimeline(item.id, 'title', e.target.value)}
                      disabled={!editing}
                    />
                  </label>
                  <label className="field">
                    <span>Summary</span>
                    <textarea
                      className="input textarea"
                      value={item.summary}
                      onChange={(e) => updateTimeline(item.id, 'summary', e.target.value)}
                      disabled={!editing}
                    />
                  </label>
                </div>
              ))}
            </div>
          </article>

          <article className="feature-card">
            <div className="feature-top">
              <div>
                <h3>Tasks / follow-ups</h3>
                <p>Keep recommendations and revisit actions visible.</p>
              </div>
              {editing ? (
                <button
                  className="button button-secondary"
                  onClick={() => updateData('tasks', [...form.data.tasks, blankTask()])}
                >
                  Add task
                </button>
              ) : null}
            </div>

            <div className="stack gap-12">
              {form.data.tasks.map((task) => (
                <div className="repeat-card" key={task.id}>
                  <div className="form-grid two-columns">
                    <label className="field">
                      <span>Task</span>
                      <input
                        className="input"
                        value={task.title}
                        onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Owner</span>
                      <input
                        className="input"
                        value={task.owner}
                        onChange={(e) => updateTask(task.id, 'owner', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Due date</span>
                      <input
                        className="input"
                        type="date"
                        value={task.dueDate}
                        onChange={(e) => updateTask(task.id, 'dueDate', e.target.value)}
                        disabled={!editing}
                      />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select
                        className="input"
                        value={task.status}
                        onChange={(e) => updateTask(task.id, 'status', e.target.value)}
                        disabled={!editing}
                      >
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Done</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="workspace-side stack gap-20">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Linked audits</h3>
                <p className="muted-copy">All audits connected to this client.</p>
              </div>
            </div>
            <div className="panel-body stack gap-12">
              {audits.length === 0 ? <div className="muted-copy">No audits yet.</div> : null}
              {audits.map((audit) => (
                <div className="saved-item" key={audit.id}>
                  <div>
                    <strong>{audit.title}</strong>
                    <div className="saved-meta">{audit.review_date || 'No date'}</div>
                  </div>
                  <Link className="button button-ghost" to={`/audit?client=${client.id}&load=${audit.id}`}>
                    Open
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Linked menu projects</h3>
                <p className="muted-copy">All menu work connected to this client.</p>
              </div>
            </div>
            <div className="panel-body stack gap-12">
              {menus.length === 0 ? <div className="muted-copy">No menu projects yet.</div> : null}
              {menus.map((menu) => (
                <div className="saved-item" key={menu.id}>
                  <div>
                    <strong>{menu.title}</strong>
                    <div className="saved-meta">{menu.review_date || 'No date'}</div>
                  </div>
                  <Link className="button button-ghost" to={`/menu?client=${client.id}&load=${menu.id}`}>
                    Open
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}