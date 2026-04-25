import type { ClientProfile } from '../../../types';

type ClientProfileHeaderProps = {
  client: ClientProfile;
  mainContact: string;
  siteCount: number;
  outstandingBalance: string;
  lastReviewDate: string;
  editing: boolean;
  saving: boolean;
  onToggleEditing: () => void;
  onSave: () => void;
  onNewQuote: () => void;
  onNewInvoice: () => void;
  onNewAudit: () => void;
  onOpenPortal: () => void;
  onDeleteClient: () => void;
};

export function ClientProfileHeader({
  client,
  mainContact,
  siteCount,
  outstandingBalance,
  lastReviewDate,
  editing,
  saving,
  onToggleEditing,
  onSave,
  onNewQuote,
  onNewInvoice,
  onNewAudit,
  onOpenPortal,
  onDeleteClient
}: ClientProfileHeaderProps) {
  return (
    <header className="client-ops-header">
      <div className="client-ops-header-main">
        <div className="client-ops-title-block">
          <p className="client-ops-kicker">The Final Check CRM</p>
          <h1>{client.companyName || 'Client profile'}</h1>
          <div className="client-ops-meta-row">
            <span className="status-badge status-primary">{client.status || 'Active'}</span>
            <span>{mainContact || 'No main contact set'}</span>
            <span>{siteCount} site{siteCount === 1 ? '' : 's'}</span>
            <span>{outstandingBalance} outstanding</span>
            <span>Last review {lastReviewDate}</span>
          </div>
        </div>

        <div className="client-ops-actions">
          <button
            className={editing ? 'button button-warning' : 'button button-secondary'}
            onClick={onToggleEditing}
            type="button"
          >
            {editing ? 'Cancel edit' : 'Edit client'}
          </button>
          <button className="button button-secondary" onClick={onNewQuote} type="button">
            New quote
          </button>
          <button className="button button-secondary" onClick={onNewInvoice} type="button">
            New invoice
          </button>
          <button className="button button-secondary" onClick={onNewAudit} type="button">
            New audit
          </button>
          <button className="button button-secondary" onClick={onOpenPortal} type="button">
            Open portal
          </button>
          <button className="button button-ghost danger-text" onClick={onDeleteClient} type="button">
            Delete client
          </button>
          <button
            className="button button-primary"
            disabled={!editing || saving}
            onClick={onSave}
            type="button"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </header>
  );
}
