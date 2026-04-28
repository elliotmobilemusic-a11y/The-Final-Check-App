import React from 'react';

// ==============================================
// STANDARDISED UI PRIMITIVES - STAGE 2
// The Final Check App Shared Component Library
// ==============================================

export * from './NumericInput';
export * from './StatCard';

// ==============================================
// SECTION CARD
// ==============================================

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'default' | 'compact' | 'none';
}

export function SectionCard({ children, className = '', header, footer, padding = 'default' }: SectionCardProps) {
  const paddingClasses = {
    default: '',
    compact: 'panel-compact',
    none: 'panel-no-padding'
  };
  
  return (
    <div className={`panel ${paddingClasses[padding]} ${className}`}>
      {header && <div className="panel-header">{header}</div>}
      <div className="panel-body">{children}</div>
      {footer && <div className="panel-footer">{footer}</div>}
    </div>
  );
}

// ==============================================
// PAGE HEADER
// ==============================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, kicker, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`page-intro ${className}`}>
      <div className="page-intro-main">
        <div className="page-intro-copy">
          {kicker && <div className="page-intro-eyebrow">{kicker}</div>}
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="page-intro-actions">{actions}</div>}
      </div>
    </div>
  );
}

// ==============================================
// SECTION HEADER
// ==============================================

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`client-tab-section-heading ${className}`}>
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action && action}
    </div>
  );
}

// ==============================================
// ACTION ROW
// ==============================================

interface ActionRowProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end' | 'between';
  className?: string;
  gap?: 'small' | 'default' | 'large';
}

export function ActionRow({ children, align = 'end', className = '', gap = 'default' }: ActionRowProps) {
  const gapClasses = {
    small: 'gap-8',
    default: 'gap-12',
    large: 'gap-16'
  };
  
  const justifyContent = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between'
  };
  
  return (
    <div 
      className={`button-row ${gapClasses[gap]} ${className}`}
      style={{ justifyContent: justifyContent[align] }}
    >
      {children}
    </div>
  );
}

// ==============================================
// FIELD GROUP
// ==============================================

interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
  helperText?: string;
  error?: string;
  className?: string;
  required?: boolean;
}

export function FieldGroup({ label, children, helperText, error, className = '', required = false }: FieldGroupProps) {
  return (
    <div className={`field ${className}`}>
      <span>
        {label}
        {required && <span className="field-required"> *</span>}
      </span>
      {children}
      {helperText && !error && <div className="muted-copy small">{helperText}</div>}
      {error && <div className="danger-text small field-error-message">{error}</div>}
    </div>
  );
}

// ==============================================
// FORM SECTION
// ==============================================

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className = '' }: FormSectionProps) {
  return (
    <div className={`form-section ${className}`}>
      {title && <h4 className="form-section-title">{title}</h4>}
      {description && <p className="form-section-description muted-copy">{description}</p>}
      <div className="form-section-content">
        {children}
      </div>
    </div>
  );
}

// ==============================================
// EMPTY STATE
// ==============================================

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`dashboard-empty empty-state ${className}`}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <strong className="empty-state-title">{title}</strong>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

// ==============================================
// LOADING STATE
// ==============================================

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'default' | 'large';
  className?: string;
}

export function LoadingState({ message = 'Loading...', size = 'default', className = '' }: LoadingStateProps) {
  return (
    <div className={`loading-state ${className}`}>
      <div className={`cooking-loader cooking-loader-${size}`} />
      <p className="loading-state-message muted-copy">{message}</p>
    </div>
  );
}

// ==============================================
// STATUS BADGE
// ==============================================

type BadgeVariant = 
  // Client statuses
  | 'active' | 'prospect' | 'archived'
  // Work statuses
  | 'draft' | 'in-progress' | 'completed' | 'sent'
  // Portal statuses
  | 'visible' | 'hidden' | 'published'
  // Invoice statuses
  | 'paid' | 'overdue' | 'cancelled'
  // Quote statuses
  | 'accepted' | 'declined' | 'invoiced'
  // Generic
  | 'success' | 'warning' | 'danger' | 'neutral';

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className = '' }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge-${variant} ${className}`}>
      {children}
    </span>
  );
}

// ==============================================
// DATA TABLE
// ==============================================

interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({ 
  columns, 
  data, 
  keyExtractor, 
  loading = false,
  emptyMessage = 'No items to display',
  emptyAction,
  onRowClick,
  className = ''
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingState message="Loading data..." />;
  }
  
  if (data.length === 0) {
    return <EmptyState title={emptyMessage} action={emptyAction} />;
  }
  
  return (
    <div className={`data-table-container ${className}`}>
      {/* Desktop Table View */}
      <table className="data-table desktop-only">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key} style={{ width: column.width }}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr 
              key={keyExtractor(row)} 
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map(column => (
                <td key={column.key}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Mobile Card View */}
      <div className="mobile-table-cards tablet-only">
        {data.map(row => (
          <div 
            key={keyExtractor(row)} 
            className="mobile-table-card"
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.filter(c => !c.hideOnMobile).map(column => (
              <div key={column.key} className="mobile-table-row">
                <div className="mobile-table-label">{column.header}</div>
                <div className="mobile-table-value">{column.render(row)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==============================================
// MODAL SHELL
// ==============================================

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'small' | 'default' | 'large' | 'full';
  className?: string;
}

export function ModalShell({ isOpen, onClose, title, children, footer, size = 'default', className = '' }: ModalShellProps) {
  if (!isOpen) return null;
  
  const sizeClasses = {
    small: 'modal-small',
    default: 'modal-default',
    large: 'modal-large',
    full: 'modal-full'
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-shell ${sizeClasses[size]} ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="modal-close-button button-ghost" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ==============================================
// DRAWER SHELL
// ==============================================

interface DrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: 'left' | 'right';
  className?: string;
}

export function DrawerShell({ isOpen, onClose, title, children, footer, position = 'right', className = '' }: DrawerShellProps) {
  if (!isOpen) return null;
  
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div 
        className={`drawer-shell drawer-${position} ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="drawer-header">
            <h3>{title}</h3>
            <button className="drawer-close-button button-ghost" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        )}
        <div className="drawer-body">
          {children}
        </div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ==============================================
// SEARCH AND FILTER BAR
// ==============================================

interface SearchAndFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  className?: string;
}

export function SearchAndFilterBar({ 
  searchValue, 
  onSearchChange, 
  placeholder = 'Search...', 
  children, 
  className = '' 
}: SearchAndFilterBarProps) {
  return (
    <div className={`search-filter-bar ${className}`}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="input search-input"
        />
      </div>
      {children && (
        <div className="filter-controls">
          {children}
        </div>
      )}
    </div>
  );
}

// ==============================================
// PORTAL VISIBILITY TOGGLE
// ==============================================

interface PortalVisibilityToggleProps {
  visible: boolean;
  onChange: (visible: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function PortalVisibilityToggle({ 
  visible, 
  onChange, 
  disabled = false, 
  label = 'Visible in client portal' 
}: PortalVisibilityToggleProps) {
  return (
    <label className="portal-toggle">
      <input
        type="checkbox"
        checked={visible}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="portal-toggle-track">
        <span className="portal-toggle-handle" />
      </span>
      <span className="portal-toggle-label">{label}</span>
      <StatusBadge variant={visible ? 'visible' : 'hidden'}>
        {visible ? 'Visible' : 'Hidden'}
      </StatusBadge>
    </label>
  );
}