import type { ClientPortalSettings } from '../../../types';

export type ClientPortalCategoryControl = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  count?: number;
};

export type ClientPortalSharedItem = {
  id: string;
  title: string;
  typeLabel: string;
  visible: boolean;
  releaseDate: string;
};

type ClientPortalTabProps = {
  portal: ClientPortalSettings;
  editing: boolean;
  portalLink: string;
  publishing: boolean;
  categoryControls: ClientPortalCategoryControl[];
  sharedItems: ClientPortalSharedItem[];
  onToggleEnabled: (enabled: boolean) => void;
  onUpdateTextField: (
    key: 'welcomeTitle' | 'welcomeMessage' | 'portalNote',
    value: string
  ) => void;
  onToggleCategory: (key: string, enabled: boolean) => void;
  onToggleSharedItem: (id: string, visible: boolean) => void;
  onPublish: () => void;
  onCopyLink: () => void;
  onOpenPortal: () => void;
};

export function ClientPortalTab({
  portal,
  editing,
  portalLink,
  publishing,
  categoryControls,
  sharedItems,
  onToggleEnabled,
  onUpdateTextField,
  onToggleCategory,
  onToggleSharedItem,
  onPublish,
  onCopyLink,
  onOpenPortal
}: ClientPortalTabProps) {
  return (
    <div className="client-tab-layout">
      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Client portal</h2>
            <p>Release controls, portal copy, and the exact items the client can see.</p>
          </div>
          <div className="client-inline-actions">
            <button
              className="button button-secondary"
              disabled={publishing || !portal.enabled}
              onClick={onPublish}
              type="button"
            >
              {publishing ? 'Publishing...' : 'Publish portal'}
            </button>
            <button className="button button-ghost" onClick={onCopyLink} type="button">
              Copy portal link
            </button>
            <button className="button button-ghost" onClick={onOpenPortal} type="button">
              Open portal
            </button>
          </div>
        </div>

        <div className="client-portal-toolbar">
          <div className="client-portal-status">
            <span>Portal enabled</span>
            <button
              className={`quote-toggle-button ${portal.enabled ? 'active' : ''}`}
              disabled={!editing}
              onClick={() => onToggleEnabled(!portal.enabled)}
              type="button"
            >
              {portal.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="client-portal-status">
            <span>Release mode</span>
            <strong>{portal.visibilityMode === 'paid_only' ? 'Paid unlock' : 'Immediate release'}</strong>
          </div>
          <div className="client-portal-status client-portal-link-preview">
            <span>Portal link</span>
            <strong>{portalLink ? 'Published' : 'Not published yet'}</strong>
          </div>
        </div>

        {portalLink ? (
          <div className="share-link-row">
            <input
              className="input"
              readOnly
              value={portalLink}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button className="button button-secondary" onClick={onCopyLink} type="button">
              Copy
            </button>
            <button className="button button-ghost" onClick={onOpenPortal} type="button">
              Open
            </button>
          </div>
        ) : null}
      </section>

      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Portal copy</h2>
            <p>Keep the client-facing message controlled from one place.</p>
          </div>
        </div>

        <div className="client-form-grid client-form-grid-wide">
          <label className="field client-field-span-2">
            <span>Portal headline</span>
            <input
              className="input"
              disabled={!editing}
              value={portal.welcomeTitle}
              onChange={(event) => onUpdateTextField('welcomeTitle', event.target.value)}
            />
          </label>
          <label className="field client-field-span-2">
            <span>Welcome message</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={portal.welcomeMessage}
              onChange={(event) => onUpdateTextField('welcomeMessage', event.target.value)}
            />
          </label>
          <label className="field client-field-span-2">
            <span>Portal note</span>
            <textarea
              className="input textarea"
              disabled={!editing}
              value={portal.portalNote}
              onChange={(event) => onUpdateTextField('portalNote', event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Visibility controls</h2>
            <p>Choose which categories are visible before you publish the next portal update.</p>
          </div>
        </div>

        <div className="client-portal-category-grid">
          {categoryControls.map((control) => (
            <article className="client-portal-category" key={control.key}>
              <div>
                <strong>{control.label}</strong>
                <p>{control.description}</p>
              </div>
              <div className="client-portal-category-meta">
                {typeof control.count === 'number' ? (
                  <span className="soft-pill">{control.count}</span>
                ) : null}
                <button
                  className={`quote-toggle-button ${control.enabled ? 'active' : ''}`}
                  disabled={!editing}
                  onClick={() => onToggleCategory(control.key, !control.enabled)}
                  type="button"
                >
                  {control.enabled ? 'Visible' : 'Hidden'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Shared items</h2>
            <p>Per-item control for the resources that can appear in the client portal.</p>
          </div>
        </div>

        <div className="client-data-table-shell">
          <div className="client-data-table client-shared-table">
            <div className="client-data-table-head">
              <span>Item title</span>
              <span>Item type</span>
              <span>Release date</span>
              <span>Visibility</span>
              <span>Action</span>
            </div>

            {sharedItems.length === 0 ? (
              <div className="dashboard-empty">No linked client-facing items yet.</div>
            ) : (
              sharedItems.map((item) => (
                <div className="client-data-row" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.typeLabel}</span>
                  <span>{item.releaseDate}</span>
                  <span>{item.visible ? 'Visible' : 'Hidden'}</span>
                  <button
                    className="button button-ghost"
                    disabled={!editing}
                    onClick={() => onToggleSharedItem(item.id, !item.visible)}
                    type="button"
                  >
                    {item.visible ? 'Remove from portal' : 'Release to portal'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
