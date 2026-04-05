import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { createEmptyClientData } from '../../features/clients/clientData';
import {
  getBusinessProfile,
  searchBusinessProfiles,
  type BusinessLookupProfile,
  type BusinessLookupResult
} from '../../features/clients/businessLookup';
import { createClient } from '../../services/clients';
import type { ClientProfile } from '../../types';

type LookupScopeFilter = 'group' | 'site' | 'all';

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

function clientSitesFromLookup(lookup: BusinessLookupProfile) {
  return lookup.sites.map((site, index) => ({
    id: `site-${lookup.id}-${index}`,
    name: site.name,
    address: site.address,
    website: site.website,
    status: site.status || 'Active',
    notes: site.notes || 'Imported from AI business search.'
  }));
}

function mergeLookupIntoClient(current: ClientProfile, lookup: BusinessLookupProfile): ClientProfile {
  const nextTags = [...new Set([lookup.industry, ...current.tags].filter(Boolean))];
  const nextSites = current.data.sites.length ? current.data.sites : clientSitesFromLookup(lookup);

  return {
    ...current,
    companyName: lookup.name || current.companyName,
    location: lookup.location || current.location,
    logoUrl: lookup.logoUrl || current.logoUrl,
    coverUrl: lookup.coverUrl || current.coverUrl || lookup.logoUrl,
    industry: lookup.industry || current.industry,
    website: lookup.website || current.website,
    contactEmail: lookup.email || current.contactEmail,
    contactPhone: lookup.phone || current.contactPhone,
    tags: nextTags,
    data: {
      ...current.data,
      profileSummary: current.data.profileSummary || lookup.summary,
      sites: nextSites,
      accountScope: lookup.accountScope || current.data.accountScope,
      operatingCountry: lookup.country || current.data.operatingCountry,
      siteCountEstimate:
        current.data.siteCountEstimate > 1
          ? current.data.siteCountEstimate
          : lookup.siteCountEstimate || nextSites.length || current.data.siteCountEstimate,
      registeredName: current.data.registeredName || lookup.officialName || lookup.name,
      registeredAddress:
        current.data.registeredAddress || lookup.registeredAddress || lookup.addressLine,
      billingName: current.data.billingName || lookup.name,
      billingEmail: current.data.billingEmail || lookup.email,
      billingAddress: current.data.billingAddress || lookup.registeredAddress || lookup.addressLine,
      companyNumber: current.data.companyNumber || lookup.companyNumber,
      vatNumber: current.data.vatNumber || lookup.vatNumber,
      leadSource: current.data.leadSource || 'AI business search'
    }
  };
}

export function NewClientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ClientProfile>(blankClient);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('Set up the new account and then save it into the CRM.');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<BusinessLookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupScope, setLookupScope] = useState<LookupScopeFilter>('group');
  const [lookupSelectionId, setLookupSelectionId] = useState('');
  const [lookupMessage, setLookupMessage] = useState(
    'Search for UK hospitality groups, pub companies, restaurant brands, or individual sites before saving the client.'
  );

  const visibleLookupResults = useMemo(() => {
    if (lookupScope === 'all') return lookupResults;
    return lookupResults.filter((result) =>
      lookupScope === 'group' ? result.resultType === 'group' : result.resultType === 'site'
    );
  }, [lookupResults, lookupScope]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.companyName.trim()) {
      setMessage('Please enter a company name.');
      return;
    }

    try {
      setSaving(true);
      const created = await createClient(form);
      setMessage('Client created.');
      navigate(`/clients/${created.id}`);
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
      const results = await searchBusinessProfiles(query, lookupScope);
      setLookupResults(results);
      setLookupMessage(
        results.length
          ? `Found ${results.length} business match${results.length === 1 ? '' : 'es'}. Review the strongest result and apply it before saving.`
          : 'No recognised business matches found. Try the trading name, website, or head-office brand.'
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
      setLookupMessage(`Loaded details for ${profile.name}. Review the account information before saving.`);
      setMessage(`Business details loaded for ${profile.name}.`);
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : 'Could not load business details.');
    } finally {
      setLookupLoading(false);
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
        description="Create the account once, pull in the right UK business record, and save it straight into the CRM with the core commercial and site details already structured."
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
        side={
          <div className="page-intro-summary">
            <span className="soft-pill">Setup workflow</span>
            <strong>Business finder first</strong>
            <p>{message}</p>
            <div className="page-intro-summary-list">
              <div>
                <span>Account scope</span>
                <strong>{form.data.accountScope}</strong>
              </div>
              <div>
                <span>Expected sites</span>
                <strong>{form.data.siteCountEstimate}</strong>
              </div>
              <div>
                <span>Lead source</span>
                <strong>{form.data.leadSource || 'Not set'}</strong>
              </div>
            </div>
          </div>
        }
      />

      <form className="panel" id="new-client-form" onSubmit={handleSubmit}>
        <div className="panel-header">
          <div>
            <h3>Client setup</h3>
            <p className="muted-copy">Use the finder, review the details, then save the account into the CRM.</p>
          </div>
        </div>

        <div className="panel-body stack gap-24">
          <section className="crm-lookup-shell">
            <div className="crm-lookup-top">
              <div>
                <h4>Business finder</h4>
                <p className="muted-copy">
                  Search for the head office, hospitality group, brand, or site and pull the strongest UK business record into the account draft.
                </p>
              </div>
              <span className="soft-pill">UK-only workflow</span>
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
              <label className="field">
                <span>Show results for</span>
                <select
                  className="input"
                  value={lookupScope}
                  onChange={(event) => setLookupScope(event.target.value as LookupScopeFilter)}
                >
                  <option value="group">Groups and head office</option>
                  <option value="site">Single sites</option>
                  <option value="all">All UK matches</option>
                </select>
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

            {visibleLookupResults.length ? (
              <div className="crm-lookup-results">
                {visibleLookupResults.map((result) => (
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
                            {result.resultType === 'group' ? 'Group match' : 'Site match'}
                          </span>
                          <span className="crm-alert-chip">{result.accountScope}</span>
                          <span className="crm-alert-chip">UK</span>
                          <span className="crm-alert-chip">{result.sourceLabel}</span>
                        </div>

                        <div className="crm-alert-row">
                          {result.industry ? <span className="crm-alert-chip is-stable">{result.industry}</span> : null}
                          {result.location ? <span className="crm-alert-chip is-warning">{result.location}</span> : null}
                          {result.website ? (
                            <span className="crm-alert-chip">{result.website.replace(/^https?:\/\//, '')}</span>
                          ) : null}
                          {result.email ? <span className="crm-alert-chip">{result.email}</span> : null}
                          {result.phone ? <span className="crm-alert-chip">{result.phone}</span> : null}
                          {result.siteCountEstimate > 1 ? (
                            <span className="crm-alert-chip is-stable">
                              {result.siteCountEstimate} known sites
                            </span>
                          ) : null}
                          {result.companyNumber ? (
                            <span className="crm-alert-chip">Co. {result.companyNumber}</span>
                          ) : null}
                        </div>

                        {result.registeredAddress || result.addressLine ? (
                          <p className="crm-lookup-note">
                            {result.registeredAddress || result.addressLine}
                          </p>
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
                      <a className="button button-ghost" href={result.sourceUrl} rel="noreferrer" target="_blank">
                        Source
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : lookupResults.length ? (
              <p className="muted-copy">No results match the current filter. Switch between groups and sites to narrow the search.</p>
            ) : null}
          </section>

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
                  type="number"
                  min="0"
                  value={form.data.estimatedMonthlyValue}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: { ...form.data, estimatedMonthlyValue: Number(event.target.value) }
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
                  type="number"
                  min="0"
                  value={form.data.siteCountEstimate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      data: { ...form.data, siteCountEstimate: Number(event.target.value) }
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
