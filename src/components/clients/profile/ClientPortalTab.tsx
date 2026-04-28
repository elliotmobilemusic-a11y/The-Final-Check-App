import type { ClientPortalSettings } from '../../../types';
import {
  SectionCard,
  SectionHeader,
  ActionRow,
  StatusBadge,
  DataTable,
  FieldGroup
} from '../../ui';

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
  const sharedItemColumns = [
    {
      key: 'title',
      header: 'Item title',
      render: (item: ClientPortalSharedItem) => <strong>{item.title}</strong>
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: ClientPortalSharedItem) => <span>{item.typeLabel}</span>,
      hideOnMobile: true
    },
    {
      key: 'releaseDate',
      header: 'Release date',
      render: (item: ClientPortalSharedItem) => <span>{item.releaseDate}</span>,
      hideOnMobile: true
    },
    {
      key: 'visibility',
      header: 'Visibility',
      render: (item: ClientPortalSharedItem) => (
        <StatusBadge variant={item.visible ? 'visible' : 'hidden'}>
          {item.visible ? 'Visible' : 'Hidden'}
        </StatusBadge>
      )
    },
    {
      key: 'action',
      header: 'Action',
      width: '180px',
      render: (item: ClientPortalSharedItem) => (
        <button
          className="button button-ghost"
          disabled={!editing}
          onClick={() => onToggleSharedItem(item.id, !item.visible)}
          type="button"
        >
          {item.visible ? 'Remove from portal' : 'Release to portal'}
        </button>
      )
    }
  ];

  return (
    <div className="client-tab-layout">
      {/* Portal status */}
      <SectionCard>
        <SectionHeader
          title="Client portal"
          description="Release controls, portal copy, and the exact items the client can see."
          action={
            <ActionRow gap="small">
              <button
                className="button button-secondary"
                disabled={publishing || !portal.enabled}
                onClick={onPublish}
                type="button"
              >
                {publishing ? 'Publishing...' : 'Publish portal'}
              </button>
              <button className="button button-ghost" onClick={onCopyLink} type="button">
                Copy link
              </button>
              <button className="button button-ghost" onClick={onOpenPortal} type="button">
                Open portal
              </button>
            </ActionRow>
          }
        />

        <div className="client-portal-toolbar">
          <div className="client-portal-status">
            <span>Portal</span>
            <div className="client-inline-actions">
              <StatusBadge variant={portal.enabled ? 'visible' : 'hidden'}>
                {portal.enabled ? 'Enabled' : 'Disabled'}
              </StatusBadge>
              {editing && (
                <button
                  className="button button-ghost"
                  onClick={() => onToggleEnabled(!portal.enabled)}
                  type="button"
                >
                  {portal.enabled ? 'Disable' : 'Enable'}
                </button>
              )}
            </div>
          </div>
          <div className="client-portal-status">
            <span>Release mode</span>
            <strong>
              {portal.visibilityMode === 'paid_only' ? 'Paid unlock' : 'Immediate release'}
            </strong>
          </div>
          <div className="client-portal-status">
            <span>Portal link</span>
            <StatusBadge variant={portalLink ? 'published' : 'neutral'}>
              {portalLink ? 'Published' : 'Not published'}
            </StatusBadge>
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
      </SectionCard>

      {/* Portal copy */}
      <SectionCard>
        <SectionHeader
          title="Portal copy"
          description="Keep the client-facing message controlled from one place."
        />
        <div className="client-form-grid client-form-grid-wide">
          <FieldGroup label="Portal headline" className="client-field-span-2">
            <input
              className="input"
              disabled={!editing}
              value={portal.welcomeTitle}
              onChange={(event) => onUpdateTextField('welcomeTitle', event.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Welcome message" className="client-field-span-2">
            <textarea
              className="input textarea"
              disabled={!editing}
              value={portal.welcomeMessage}
              onChange={(event) => onUpdateTextField('welcomeMessage', event.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Portal note" className="client-field-span-2">
            <textarea
              className="input textarea"
              disabled={!editing}
              value={portal.portalNote}
              onChange={(event) => onUpdateTextField('portalNote', event.target.value)}
            />
          </FieldGroup>
        </div>
      </SectionCard>

      {/* Visibility controls */}
      <SectionCard>
        <SectionHeader
          title="Visibility controls"
          description="Choose which categories are visible before you publish the next portal update."
        />
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
                <StatusBadge variant={control.enabled ? 'visible' : 'hidden'}>
                  {control.enabled ? 'Visible' : 'Hidden'}
                </StatusBadge>
                {editing && (
                  <button
                    className="button button-ghost"
                    onClick={() => onToggleCategory(control.key, !control.enabled)}
                    type="button"
                  >
                    {control.enabled ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      {/* Shared items */}
      <SectionCard>
        <SectionHeader
          title="Shared items"
          description="Per-item control for the resources that can appear in the client portal."
        />
        <DataTable
          columns={sharedItemColumns}
          data={sharedItems}
          keyExtractor={(item) => item.id}
          emptyMessage="No linked client-facing items yet."
        />
      </SectionCard>
    </div>
  );
}
