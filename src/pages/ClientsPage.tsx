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

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <div className="brand-badge">Client system</div>
          <h2>Add a client</h2>
          <p>
            Create a client profile first, then keep every audit and menu project tied to that client.
            This is the new system hub.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Clients" value={String(clients.length)} hint="Active client profiles" />
        <StatCard label="System status" value="Client-first" hint={message} />
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>New client profile</h3>
                <p className="muted-copy">Record who you are working with before you create reports.</p>
              </div>
            </div>

            <div className="panel-body">
              <form className="stack gap-20" onSubmit={handleSubmit}>
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
                </div>

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
                <h3>Client profiles</h3>
                <p className="muted-copy">Open a client to see all audits and menu reports linked to them.</p>
              </div>
            </div>

            <div className="panel-body stack gap-12">
              {clients.length === 0 ? <div className="muted-copy">No clients created yet.</div> : null}

              {clients.map((client) => (
                <div className="saved-item" key={client.id}>
                  <div>
                    <strong>{client.company_name}</strong>
                    <div className="saved-meta">
                      {client.location || 'No location'} • {client.contact_name || 'No contact'}
                    </div>
                  </div>
                  <div className="saved-actions">
                    <Link className="button button-ghost" to={`/clients/${client.id}`}>
                      Open
                    </Link>
                    <button className="button button-ghost danger-text" onClick={() => handleDelete(client.id)}>
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