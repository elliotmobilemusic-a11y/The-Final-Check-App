interface ClientProfileHeaderProps {
  companyName: string;
  contactName: string;
  status: string;
  industry: string;
  outstandingBalance: string;
  lastReviewDate: string;
  siteCount: number;
  editing: boolean;
  saving: boolean;
  onToggleEditing: () => void;
  onSave: () => void;
  onNewQuote: () => void;
  onNewInvoice: () => void;
  onNewAudit: () => void;
  onOpenPortal: () => void;
  onDeleteClient: () => void;
}

export function ClientProfileHeader({
  companyName,
  contactName,
  status,
  industry,
  outstandingBalance,
  lastReviewDate,
  siteCount,
  editing,
  saving,
  onToggleEditing,
  onSave,
  onNewQuote,
  onNewInvoice,
  onNewAudit,
  onOpenPortal
}: ClientProfileHeaderProps) {
  return (
    <header className="client-profile-header">
      <div className="client-profile-header-content">
        <div className="client-profile-header-info">
          <div className="client-profile-name-group">
            <h1>{companyName}</h1>
            <span className="client-status-badge">{status}</span>
          </div>

          <p className="client-contact-name">{contactName}</p>

          <div className="client-profile-meta-row">
            <span className="client-meta-item">{industry}</span>
            <span className="client-meta-item">{siteCount} sites</span>
            <span className="client-meta-item">Last review: {lastReviewDate}</span>
            <span className="client-meta-item client-balance">{outstandingBalance}</span>
          </div>
        </div>

        <div className="client-profile-actions">
          <div className="client-action-bar">
            {editing ? (
              <>
                <button
                  className="button button-secondary"
                  onClick={onToggleEditing}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  disabled={saving}
                  onClick={onSave}
                  type="button"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  className="button button-secondary"
                  onClick={onToggleEditing}
                  type="button"
                >
                  Edit profile
                </button>
                <button
                  className="button button-secondary"
                  onClick={onNewAudit}
                  type="button"
                >
                  New audit
                </button>
                <button
                  className="button button-secondary"
                  onClick={onNewQuote}
                  type="button"
                >
                  New quote
                </button>
                <button
                  className="button"
                  onClick={onNewInvoice}
                  type="button"
                >
                  New invoice
                </button>
                <button
                  className="button"
                  onClick={onOpenPortal}
                  type="button"
                >
                  Client portal
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
