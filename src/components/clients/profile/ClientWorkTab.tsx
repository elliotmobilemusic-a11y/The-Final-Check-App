import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

export type ClientWorkItem = {
  id: string;
  itemType:
    | 'operationalAudit'
    | 'foodSafety'
    | 'mysteryShop'
    | 'menuProject'
    | 'dishSpec'
    | 'recipeCosting'
    | 'training'
    | 'newOpenings'
    | 'other';
  label: string;
  title: string;
  site: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  portalVisible: boolean;
  valueLabel: string;
  value?: number;
  archived: boolean;
  openPath?: string;
};

type ClientWorkTabProps = {
  workItems: ClientWorkItem[];
  onDuplicate: (item: ClientWorkItem) => void;
  onArchiveToggle: (item: ClientWorkItem) => void;
  onTogglePortalVisibility: (item: ClientWorkItem, visible: boolean) => void;
  onExport: (item: ClientWorkItem) => void;
  onLinkToInvoice: (item: ClientWorkItem) => void;
  onNewServiceJob: () => void;
};

function formatShortDate(value?: string | null) {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

const filterOptions: Array<{ key: ClientWorkItem['itemType'] | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'operationalAudit', label: 'Operational audits' },
  { key: 'foodSafety', label: 'Food safety' },
  { key: 'mysteryShop', label: 'Mystery shops' },
  { key: 'menuProject', label: 'Menu projects' },
  { key: 'dishSpec', label: 'Dish specs' },
  { key: 'recipeCosting', label: 'Recipe costings' },
  { key: 'training', label: 'Training' },
  { key: 'newOpenings', label: 'New openings' },
  { key: 'other', label: 'Other services' }
];

export function ClientWorkTab({
  workItems,
  onDuplicate,
  onArchiveToggle,
  onTogglePortalVisibility,
  onExport,
  onLinkToInvoice,
  onNewServiceJob
}: ClientWorkTabProps) {
  const [filter, setFilter] = useState<ClientWorkItem['itemType'] | 'all'>('all');
  const visibleItems = useMemo(
    () => workItems.filter((item) => filter === 'all' || item.itemType === filter),
    [filter, workItems]
  );

  return (
    <div className="client-tab-layout">
      <section className="client-tab-section">
        <div className="client-tab-section-heading">
          <div>
            <h2>Work & services</h2>
            <p>One delivery view for active audits, compliance, mystery shops, menu projects, dish specs, recipe costings, and service jobs.</p>
          </div>
        </div>

        <div className="client-top-action-row">
          <Link className="button button-secondary" to={`/audit`}>
            New operational audit
          </Link>
          <Link className="button button-secondary" to={`/food-safety`}>
            New food safety audit
          </Link>
          <Link className="button button-secondary" to={`/mystery-shop`}>
            New mystery shop
          </Link>
          <Link className="button button-secondary" to={`/menu`}>
            New menu project
          </Link>
          <button className="button button-secondary" onClick={onNewServiceJob} type="button">
            New service job
          </button>
        </div>

        <div className="client-filter-row">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              className={`client-filter-chip ${filter === option.key ? 'active' : ''}`}
              onClick={() => setFilter(option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="client-data-table-shell">
          <div className="client-data-table client-work-table">
            <div className="client-data-table-head">
              <span>Service type</span>
              <span>Title</span>
              <span>Site</span>
              <span>Status</span>
              <span>Date created</span>
              <span>Last updated</span>
              <span>Portal</span>
              <span>Value</span>
              <span>Actions</span>
            </div>

            {visibleItems.length === 0 ? (
              <div className="dashboard-empty">No work items match the current filter.</div>
            ) : (
              visibleItems.map((item) => (
                <div className={`client-data-row ${item.archived ? 'is-muted' : ''}`} key={item.id}>
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                  <span>{item.site}</span>
                  <span>{item.archived ? 'Archived' : item.status}</span>
                  <span>{formatShortDate(item.createdAt)}</span>
                  <span>{formatShortDate(item.updatedAt)}</span>
                  <span>{item.portalVisible ? 'Visible' : 'Hidden'}</span>
                  <span>{item.valueLabel}</span>
                  <div className="client-row-actions">
                    {item.openPath ? (
                      <Link className="button button-ghost" to={item.openPath}>
                        Open
                      </Link>
                    ) : null}
                    {item.openPath ? (
                      <Link className="button button-ghost" to={item.openPath}>
                        Edit
                      </Link>
                    ) : null}
                    <button className="button button-ghost" onClick={() => onDuplicate(item)} type="button">
                      Duplicate
                    </button>
                    <button className="button button-ghost" onClick={() => onExport(item)} type="button">
                      Export PDF
                    </button>
                    <button className="button button-ghost" onClick={() => onArchiveToggle(item)} type="button">
                      {item.archived ? 'Restore' : 'Archive'}
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={() => onTogglePortalVisibility(item, !item.portalVisible)}
                      type="button"
                    >
                      {item.portalVisible ? 'Remove from portal' : 'Send to portal'}
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={() => onLinkToInvoice(item)}
                      type="button"
                    >
                      Link to invoice
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
