import type { BusinessLookupResult } from '../../../features/clients/businessLookup';
import type { ClientContact, ClientProfile, ClientProfileData, ClientSite } from '../../../types';

type LookupScopeFilter = 'group' | 'site' | 'all';

type ClientInformationTabProps = {
  client: ClientProfile;
  editing: boolean;
  lookupQuery: string;
  lookupScope: LookupScopeFilter;
  lookupLoading: boolean;
  lookupMessage: string;
  lookupSelectionId: string;
  visibleLookupResults: BusinessLookupResult[];
  isLookupFallbackVisible: boolean;
  onLookupQueryChange: (value: string) => void;
  onLookupScopeChange: (value: LookupScopeFilter) => void;
  onRunBusinessLookup: () => void;
  onUseLookup: (result: BusinessLookupResult) => void;
  updateField: <K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) => void;
  updateData: <K extends keyof ClientProfileData>(key: K, value: ClientProfileData[K]) => void;
  updateContact: (id: string, key: keyof ClientContact, value: string | boolean) => void;
  addContact: () => void;
  removeContact: (id: string) => void;
  updateSite: (id: string, key: keyof ClientSite, value: string) => void;
  addSite: () => void;
  removeSite: (id: string) => void;
};

function contactCategoryList(contacts: ClientContact[], category: ClientContact['category']) {
  return contacts.filter((contact) => (category === 'Primary' ? contact.isPrimary : contact.category === category));
}

export function ClientInformationTab({
  client,
  editing,
  lookupQuery,
  lookupScope,
  lookupLoading,
  lookupMessage,
  lookupSelectionId,
  visibleLookupResults,
  isLookupFallbackVisible,
  onLookupQueryChange,
  onLookupScopeChange,
  onRunBusinessLookup,
  onUseLookup,
  updateField,
  updateData,
  updateContact,
  addContact,
  removeContact,
  updateSite,
  addSite,
  removeSite
}: ClientInformationTabProps) {
  const primaryContact =
    client.data.contacts.find((contact) => contact.isPrimary) ?? client.data.contacts[0] ?? null;
  const financeContacts = contactCategoryList(client.data.contacts, 'Finance');
  const operationsContacts = contactCategoryList(client.data.contacts, 'Operations');
  const additionalContacts = client.data.contacts.filter(
    (contact) => !contact.isPrimary && contact.category !== 'Finance' && contact.category !== 'Operations'
  );

  return (
    <div className="client-tab-layout">
      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Business overview</h2>
            <p>The master record for who this client is, how they operate, and how billing is set up.</p>
          </div>
        </div>

        <div className="client-form-grid client-form-grid-wide">
          <label className="field">
            <span>Business name</span>
            <input
              className="input"
              disabled={!editing}
              value={client.companyName}
              onChange={(event) => updateField('companyName', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Trading name</span>
            <input
              className="input"
              disabled={!editing}
              value={client.data.tradingName}
              onChange={(event) => updateData('tradingName', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Business type</span>
            <input
              className="input"
              disabled={!editing}
              value={client.data.businessType}
              onChange={(event) => updateData('businessType', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Client status</span>
            <select
              className="input"
              disabled={!editing}
              value={client.status}
              onChange={(event) => updateField('status', event.target.value)}
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
              disabled={!editing}
              value={client.data.accountOwner}
              onChange={(event) => updateData('accountOwner', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Website</span>
            <input
              className="input"
              disabled={!editing}
              value={client.website}
              onChange={(event) => updateField('website', event.target.value)}
            />
          </label>
          <label className="field client-field-span-2">
            <span>Main address</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={client.data.registeredAddress}
              onChange={(event) => updateData('registeredAddress', event.target.value)}
            />
          </label>
          <label className="field client-field-span-2">
            <span>Billing details</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={[
                client.data.billingName,
                client.data.billingEmail,
                client.data.billingAddress
              ]
                .filter(Boolean)
                .join('\n')}
              onChange={(event) => {
                const [billingName = '', billingEmail = '', ...addressLines] = event.target.value.split('\n');
                updateData('billingName', billingName);
                updateData('billingEmail', billingEmail);
                updateData('billingAddress', addressLines.join('\n'));
              }}
            />
          </label>
          <label className="field">
            <span>Account structure</span>
            <select
              className="input"
              disabled={!editing}
              value={client.data.accountScope}
              onChange={(event) =>
                updateData('accountScope', event.target.value as ClientProfileData['accountScope'])
              }
            >
              <option>Single site</option>
              <option>Multi-site group</option>
              <option>Group / head office</option>
            </select>
          </label>
          <label className="field">
            <span>Number of sites</span>
            <input
              className="input"
              disabled={!editing}
              type="number"
              min="0"
              value={client.data.siteCountEstimate}
              onChange={(event) => updateData('siteCountEstimate', Number(event.target.value))}
            />
          </label>
        </div>

        <details className="client-inline-disclosure">
          <summary>Refresh business details</summary>
          <div className="client-inline-disclosure-body">
            <div className="client-form-grid">
              <label className="field client-field-span-2">
                <span>Business search</span>
                <input
                  className="input"
                  disabled={!editing}
                  placeholder="Search trading name, venue, company name, or company number"
                  value={lookupQuery}
                  onChange={(event) => onLookupQueryChange(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Show results for</span>
                <select
                  className="input"
                  disabled={!editing}
                  value={lookupScope}
                  onChange={(event) => onLookupScopeChange(event.target.value as LookupScopeFilter)}
                >
                  <option value="group">Groups and head office</option>
                  <option value="site">Single sites</option>
                  <option value="all">All UK matches</option>
                </select>
              </label>
              <button
                className="button button-secondary self-end"
                disabled={!editing || lookupLoading}
                onClick={onRunBusinessLookup}
                type="button"
              >
                {lookupLoading ? 'Searching...' : 'Find business'}
              </button>
            </div>

            <p className="muted-copy">{lookupMessage}</p>

            <div className="client-inline-list">
              {visibleLookupResults.map((result) => (
                <div className="client-inline-list-row" key={result.id}>
                  <div>
                    <strong>{result.name}</strong>
                    <div className="saved-meta">
                      {result.resultType === 'group' ? 'Group match' : 'Site match'} •{' '}
                      {result.location || 'United Kingdom'}
                    </div>
                  </div>
                  <button
                    className="button button-ghost"
                    disabled={!editing || lookupLoading}
                    onClick={() => onUseLookup(result)}
                    type="button"
                  >
                    {lookupSelectionId === result.id && lookupLoading ? 'Loading...' : 'Apply'}
                  </button>
                </div>
              ))}
            </div>

            {isLookupFallbackVisible ? (
              <p className="muted-copy">Showing fallback results because no exact scoped matches were returned.</p>
            ) : null}
          </div>
        </details>
      </section>

      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Contacts</h2>
            <p>The people Jason needs to reach quickly: primary, finance, operations, then everyone else.</p>
          </div>
          {editing ? (
            <button className="button button-secondary" onClick={addContact} type="button">
              Add contact
            </button>
          ) : null}
        </div>

        <div className="client-relationship-grid">
          <article className="client-info-block">
            <h3>Primary contact</h3>
            {primaryContact ? (
              <div className="client-form-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={primaryContact.name}
                    onChange={(event) => updateContact(primaryContact.id, 'name', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Role</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={primaryContact.role}
                    onChange={(event) => updateContact(primaryContact.id, 'role', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={primaryContact.phone}
                    onChange={(event) => updateContact(primaryContact.id, 'phone', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={primaryContact.email}
                    onChange={(event) => updateContact(primaryContact.id, 'email', event.target.value)}
                  />
                </label>
              </div>
            ) : (
              <div className="dashboard-empty">No primary contact recorded yet.</div>
            )}
          </article>

          <article className="client-info-block">
            <h3>Finance contact</h3>
            {financeContacts.length === 0 ? (
              <div className="dashboard-empty">No finance contact assigned.</div>
            ) : (
              financeContacts.map((contact) => (
                <div className="client-inline-list-row" key={contact.id}>
                  <div>
                    <strong>{contact.name || 'Finance contact'}</strong>
                    <div className="saved-meta">{contact.email || contact.phone || 'No contact detail set'}</div>
                  </div>
                </div>
              ))
            )}
          </article>

          <article className="client-info-block">
            <h3>Operations contact</h3>
            {operationsContacts.length === 0 ? (
              <div className="dashboard-empty">No operations contact assigned.</div>
            ) : (
              operationsContacts.map((contact) => (
                <div className="client-inline-list-row" key={contact.id}>
                  <div>
                    <strong>{contact.name || 'Operations contact'}</strong>
                    <div className="saved-meta">{contact.email || contact.phone || 'No contact detail set'}</div>
                  </div>
                </div>
              ))
            )}
          </article>
        </div>

        <div className="stack gap-12">
          {additionalContacts.map((contact) => (
            <div className="client-inline-record" key={contact.id}>
              <div className="client-form-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={contact.name}
                    onChange={(event) => updateContact(contact.id, 'name', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Role</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={contact.role}
                    onChange={(event) => updateContact(contact.id, 'role', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={contact.phone}
                    onChange={(event) => updateContact(contact.id, 'phone', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={contact.email}
                    onChange={(event) => updateContact(contact.id, 'email', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Type</span>
                  <select
                    className="input"
                    disabled={!editing}
                    value={contact.category ?? 'General'}
                    onChange={(event) =>
                      updateContact(contact.id, 'category', event.target.value)
                    }
                  >
                    <option>General</option>
                    <option>Finance</option>
                    <option>Operations</option>
                  </select>
                </label>
                <div className="client-inline-actions">
                  <button
                    className="button button-ghost danger-text"
                    disabled={!editing}
                    onClick={() => removeContact(contact.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          {additionalContacts.length === 0 ? (
            <div className="dashboard-empty">No additional contacts recorded yet.</div>
          ) : null}
        </div>
      </section>

      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Sites / locations</h2>
            <p>Sites stay together here so the work tab can stay focused on delivery and value.</p>
          </div>
          {editing ? (
            <button className="button button-secondary" onClick={addSite} type="button">
              Add site
            </button>
          ) : null}
        </div>

        <div className="stack gap-12">
          {client.data.sites.map((site) => (
            <article className="client-inline-record" id={`site-${site.id}`} key={site.id}>
              <div className="client-inline-record-top">
                <div>
                  <strong>{site.name || 'Unnamed site'}</strong>
                  <div className="saved-meta">{site.status || 'Active'} • {site.managerName || 'Manager not set'}</div>
                </div>
                <div className="client-inline-actions">
                  <a className="button button-ghost" href={`#site-${site.id}`}>
                    Open site record
                  </a>
                  {editing ? (
                    <button
                      className="button button-ghost danger-text"
                      onClick={() => removeSite(site.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="client-form-grid">
                <label className="field">
                  <span>Site name</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={site.name}
                    onChange={(event) => updateSite(site.id, 'name', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Site manager</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={site.managerName ?? ''}
                    onChange={(event) => updateSite(site.id, 'managerName', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Site status</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={site.status}
                    onChange={(event) => updateSite(site.id, 'status', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Website</span>
                  <input
                    className="input"
                    disabled={!editing}
                    value={site.website}
                    onChange={(event) => updateSite(site.id, 'website', event.target.value)}
                  />
                </label>
                <label className="field client-field-span-2">
                  <span>Site address</span>
                  <textarea
                    className="input textarea"
                    disabled={!editing}
                    value={site.address}
                    onChange={(event) => updateSite(site.id, 'address', event.target.value)}
                  />
                </label>
                <label className="field client-field-span-2">
                  <span>Notes</span>
                  <textarea
                    className="input textarea"
                    disabled={!editing}
                    value={site.notes}
                    onChange={(event) => updateSite(site.id, 'notes', event.target.value)}
                  />
                </label>
              </div>
            </article>
          ))}
          {client.data.sites.length === 0 ? (
            <div className="dashboard-empty">No site records added yet.</div>
          ) : null}
        </div>
      </section>

      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Background / account notes</h2>
            <p>Operational context, pain points, history, and internal relationship notes in one place.</p>
          </div>
        </div>

        <div className="client-form-grid client-form-grid-wide">
          <label className="field client-field-span-2">
            <span>Client background</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={client.data.clientBackground}
              onChange={(event) => updateData('clientBackground', event.target.value)}
            />
          </label>
          <label className="field client-field-span-2">
            <span>Context</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={client.data.clientContext}
              onChange={(event) => updateData('clientContext', event.target.value)}
            />
          </label>
          <label className="field client-field-span-2">
            <span>Pain points</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={client.data.painPoints}
              onChange={(event) => updateData('painPoints', event.target.value)}
            />
          </label>
          <label className="field client-field-span-2">
            <span>Prior work history</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={client.data.priorWorkHistory}
              onChange={(event) => updateData('priorWorkHistory', event.target.value)}
            />
          </label>
          <label className="field client-field-span-2">
            <span>Important notes</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={client.data.importantNotes}
              onChange={(event) => updateData('importantNotes', event.target.value)}
            />
          </label>
          <label className="field client-field-span-2">
            <span>Internal relationship notes</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={client.data.internalRelationshipNotes}
              onChange={(event) => updateData('internalRelationshipNotes', event.target.value)}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
