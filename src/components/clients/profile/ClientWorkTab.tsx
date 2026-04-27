import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionCard, SectionHeader, ActionRow, EmptyState, StatusBadge, DataTable } from '../../ui';

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
      <SectionCard>
        <SectionHeader
          title="Work & services"
          description="One delivery view for active audits, compliance, mystery shops, menu projects, dish specs, recipe costings, and service jobs."
          action={
            <button className="button button-primary" onClick={onNewServiceJob} type="button">
              New service job
            </button>
          }
        />

        <ActionRow align="start" gap="default">
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
        </ActionRow>

        <div className="tab-filter-bar">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              className={`tab-filter-button ${filter === option.key ? 'active' : ''}`}
              onClick={() => setFilter(option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <DataTable<ClientWorkItem>
          columns={[
            {
              key: 'itemType',
              header: 'Type',
              width: '120px',
              render: (item) => <span className="muted">{item.label}</span>
            },
            {
              key: 'title',
              header: 'Title',
              render: (item) => <strong>{item.title}</strong>
            },
            {
              key: 'site',
              header: 'Site',
              width: '120px',
              render: (item) => item.site
            },
            {
              key: 'status',
              header: 'Status',
              width: '100px',
              render: (item) => {
                if (item.archived) return <StatusBadge variant="archived">Archived</StatusBadge>;
                const statusVariant = item.status.toLowerCase().replace(' ', '-') as any;
                return <StatusBadge variant={statusVariant || 'neutral'}>{item.status}</StatusBadge>;
              }
            },
            {
              key: 'createdAt',
              header: 'Created',
              width: '100px',
              hideOnMobile: true,
              render: (item) => formatShortDate(item.createdAt)
            },
            {
              key: 'updatedAt',
              header: 'Updated',
              width: '100px',
              hideOnMobile: true,
              render: (item) => formatShortDate(item.updatedAt)
            },
            {
              key: 'portalVisible',
              header: 'Portal',
              width: '80px',
              render: (item) => item.portalVisible ? 
                <StatusBadge variant="visible">Visible</StatusBadge> : 
                <StatusBadge variant="hidden">Hidden</StatusBadge>
            },
            {
              key: 'valueLabel',
              header: 'Value',
              width: '100px',
              render: (item) => item.valueLabel
            },
            {
              key: 'actions',
              header: 'Actions',
              width: '80px',
              hideOnMobile: false,
              render: (item) => (
                <div className="table-row-actions">
                  {item.openPath && (
                    <Link className="button button-ghost small" to={item.openPath}>Open</Link>
                  )}
                  <button className="button button-ghost small" onClick={() => onExport(item)} type="button">Export</button>
                </div>
              )
            }
          ]}
          data={visibleItems}
          keyExtractor={(item) => item.id}
          emptyMessage="No work items match the current filter"
        />
      </SectionCard>
    </div>
  );
}
