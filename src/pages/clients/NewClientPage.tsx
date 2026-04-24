import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { createEmptyClientData } from '../../features/clients/clientData';
import { createClient } from '../../services/clients';
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';
import type { ClientProfile } from '../../types';

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
const NEW_CLIENT_DRAFT_KEY = 'client-new-draft-v1';

export function NewClientPage() {
  const { runWithActivity } = useActivityOverlay();
  const navigate = useNavigate();
  const [form, setForm] = useState<ClientProfile>(
    () => readDraft<ClientProfile>(NEW_CLIENT_DRAFT_KEY) ?? blankClient
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('Set up the new account and then save it into the CRM.');
  useEffect(() => {
    writeDraft(NEW_CLIENT_DRAFT_KEY, form);
  }, [form]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.companyName.trim()) {
      setMessage('Please enter a company name.');
      return;
    }

    try {
      setSaving(true);
      await runWithActivity(
        {
          kicker: 'Opening account',
          title: 'Saving new client',
          detail: 'Creating the client record and moving you into the live account workspace.'
        },
        async () => {
          const created = await createClient(form);
          clearDraft(NEW_CLIENT_DRAFT_KEY);
          setMessage('Client created.');
          navigate(`/clients/${created.id}`);
        }
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create client.');
    } finally {
      setSaving(false);
    }
  }

  function updateDraftSite(id: string, key: 'name' | 'address' | 'website' | 'status' | 'notes', value: string) {
    setForm((current) => ({
      ...current,
      data: {
        ...current.data,
        sites: current.data.sites.map((site) => (site.id === id ? { ...site, [key]: value } : site))
      }
    }));
  }

  function removeDraftSite(id: string) {
    setForm((current) => ({
      ...current,
      data: {
        ...current.data,
        sites: current.data.sites.filter((site) => site.id !== id)
      }
    }));
  }

  function addDraftSite() {
    setForm((current) => ({
      ...current,
      data: {
        ...current.data,
        sites: [
          ...current.data.sites,
          {
            id: `site-draft-${Date.now()}`,
            name: '',
            address: '',
            website: '',
            status: 'Active',
            notes: ''
          }
        ]
      }
    }));
  }

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Clients"
        title="Add new client"
        description="Build the record once and save a cleaner account handoff into the CRM with commercial and site context already in place."
        actions={
          <>
            <button className="button button-primary" form="new-client-form" disabled={saving}>
              {saving ? 'Saving...' : 'Create client'}
            </button>
            <Link className="button button-secondary" to="/clients">
              Back to client list
            </Link>
          </>
        }
      >
        <div className="page-inline-note">{message}</div>
      </PageIntro>

      <form className="panel" id="new-client-form" onSubmit={handleSubmit}>
        <div className="panel-header">
          <div>
            <h3>Client setup</h3>
            <p className="muted-copy">Use the finder, review the details, then save the account into the CRM.</p>
          </div>
        </div>

        <div className="panel-body stack gap-24">

          <section className="sub-panel">
            <div className="sub-panel-header">
              <div>
                <h4>Core account details</h4>
                <p className="muted-copy">Save the minimum account detail needed to start work cleanly.</p>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Company name</span>
                <input className="input" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
              </label>
              <label className="field">
                <span>Main contact</span>
                <input className="input" value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
              </label>
              <label className="field">
                <span>Contact email</span>
                <input className="input" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
              </label>
              <label className="field">
                <span>Contact phone</span>
                <input className="input" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} />
              </label>
              <label className="field">
                <span>Location</span>
                <input className="input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
              </label>
              <label className="field">
                <span>Status</span>
                <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option>Active</option>
                  <option>Prospect</option>
                  <option>Onboarding</option>
                  <option>Paused</option>
                  <option>Completed</option>
                </select>
              </label>
            </div>
          </section>

          <section className="sub-panel">
            <div className="sub-panel-header">
              <div>
                <h4>Commercial and CRM setup</h4>
                <p className="muted-copy">Record who owns the account, how valuable it is, and how it should behave in the CRM.</p>
              </div>
            </div>

            <div className="form-grid three-balance">
              <label className="field">
                <span>Account owner</span>
                <input
                  className="input"
                  value={form.data.accountOwner}
                  onChange={(event) =>
                    setForm({ ...form, data: { ...form.data, accountOwner: event.target.value } })
                  }
                />
              </label>
              <label className="field">
                <span>Account scope</span>
                <select
                  className="input"
                  value={form.data.accountScope}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: {
                        ...form.data,
                        accountScope: event.target.value as typeof form.data.accountScope
                      }
                    })
                  }
                >
                  <option>Single site</option>
                  <option>Multi-site group</option>
                  <option>Group / head office</option>
                </select>
              </label>
              <label className="field">
                <span>Estimated monthly value</span>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={form.data.estimatedMonthlyValue}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: {
                        ...form.data,
                        estimatedMonthlyValue: Number(event.target.value || 0)
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
                    setForm({ ...form, data: { ...form.data, leadSource: event.target.value } })
                  }
                />
              </label>
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
                <span>Operating country</span>
                <input
                  className="input"
                  value={form.data.operatingCountry}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: { ...form.data, operatingCountry: event.target.value }
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
                    data: { ...form.data, profileSummary: event.target.value }
                  })
                }
              />
            </label>
          </section>

          <section className="sub-panel">
            <div className="sub-panel-header">
              <div>
                <h4>Registered and web details</h4>
                <p className="muted-copy">Keep the website and legal details alongside the main CRM record from the start.</p>
              </div>
            </div>

            <div className="form-grid two-columns">
              <label className="field">
                <span>Website</span>
                <input className="input" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
              </label>
              <label className="field">
                <span>Logo image URL</span>
                <input className="input" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} />
              </label>
              <label className="field">
                <span>Registered name</span>
                <input
                  className="input"
                  value={form.data.registeredName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: { ...form.data, registeredName: event.target.value }
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Company number</span>
                <input
                  className="input"
                  value={form.data.companyNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: { ...form.data, companyNumber: event.target.value }
                    })
                  }
                />
              </label>
              <label className="field">
                <span>VAT number</span>
                <input
                  className="input"
                  value={form.data.vatNumber}
                  onChange={(event) =>
                    setForm({ ...form, data: { ...form.data, vatNumber: event.target.value } })
                  }
                />
              </label>
              <label className="field">
                <span>Estimated site count</span>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.data.siteCountEstimate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: { ...form.data, siteCountEstimate: Number(event.target.value || 0) }
                    })
                  }
                />
              </label>
            </div>

            <label className="field">
              <span>Registered / billing address</span>
              <textarea
                className="input textarea"
                value={form.data.registeredAddress || form.data.billingAddress}
                onChange={(event) =>
                  setForm({
                    ...form,
                    data: {
                      ...form.data,
                      registeredAddress: event.target.value,
                      billingAddress: form.data.billingAddress || event.target.value
                    }
                  })
                }
              />
            </label>
          </section>

          <section className="crm-site-planner">
            <div className="feature-top">
              <div>
                <h4>Site planner</h4>
                <p className="muted-copy">For multi-site clients, keep the account at group level and track the operating sites beneath it.</p>
              </div>
              <button className="button button-secondary" onClick={addDraftSite} type="button">
                Add site
              </button>
            </div>

            {form.data.sites.length === 0 ? (
              <div className="dashboard-empty">
                No sites added yet. Group matches can load sample UK sites automatically.
              </div>
            ) : (
              <div className="crm-site-list">
                {form.data.sites.map((site) => (
                  <article className="crm-site-card" key={site.id}>
                    <div className="crm-site-card-top">
                      <strong>{site.name || 'Untitled site'}</strong>
                      <button
                        className="button button-ghost danger-text"
                        onClick={() => removeDraftSite(site.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="form-grid two-columns">
                      <label className="field">
                        <span>Site name</span>
                        <input className="input" value={site.name} onChange={(event) => updateDraftSite(site.id, 'name', event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Status</span>
                        <input className="input" value={site.status} onChange={(event) => updateDraftSite(site.id, 'status', event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Address</span>
                        <input className="input" value={site.address} onChange={(event) => updateDraftSite(site.id, 'address', event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Website</span>
                        <input className="input" value={site.website} onChange={(event) => updateDraftSite(site.id, 'website', event.target.value)} />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </form>
    </div>
  );
}
