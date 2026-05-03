function statusPillClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'active') return 'status-pill status-success';
  if (s === 'prospect' || s === 'onboarding') return 'status-pill status-warning';
  if (s === 'paused' || s === 'completed' || s === 'inactive') return 'status-pill status-danger';
  return 'status-pill';
}

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
  message?: string;
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
  message,
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
        <div className="client-profile-header-identity">
          <div className="client-profile-avatar" aria-hidden="true">
            {(companyName || 'C').charAt(0).toUpperCase()}
          </div>

          <div className="client-profile-header-info">
            <span className="client-profile-eyebrow">Clients</span>

            <div className="client-profile-name-group">
              <h1>{companyName}</h1>
              <span className={statusPillClass(status)}>{status}</span>
            </div>

            <p className="client-contact-name">{contactName}</p>

            <div className="client-profile-meta-row">
              <span className="client-meta-item">{industry}</span>
              <span className="client-meta-item">{siteCount} sites</span>
              <span className="client-meta-item">Next review: {lastReviewDate}</span>
              <span className="client-meta-item client-balance">{outstandingBalance}</span>
            </div>
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

      {message ? (
        <p className="client-profile-note">{message}</p>
      ) : null}
    </header>
  );
}
