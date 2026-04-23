import React from 'react';

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function SectionCard({ children, className = '', header, footer }: SectionCardProps) {
  return (
    <div className={`panel ${className}`}>
      {header && <div className="panel-header">{header}</div>}
      <div className="panel-body">{children}</div>
      {footer && <div className="panel-footer">{footer}</div>}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, kicker, actions }: PageHeaderProps) {
  return (
    <div className="page-intro">
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

interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
  helperText?: string;
  error?: string;
  className?: string;
}

export function FieldGroup({ label, children, helperText, error, className = '' }: FieldGroupProps) {
  return (
    <div className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {helperText && <div className="muted-copy small">{helperText}</div>}
      {error && <div className="danger-text small">{error}</div>}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="dashboard-empty" style={{ textAlign: 'center', padding: '32px 24px' }}>
      {icon && <div style={{ marginBottom: '12px', opacity: 0.6 }}>{icon}</div>}
      <strong style={{ display: 'block', marginBottom: '8px', fontSize: '16px' }}>{title}</strong>
      {description && <p style={{ margin: 0, color: 'var(--muted)', lineHeight: '1.6' }}>{description}</p>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}

interface ActionRowProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function ActionRow({ children, align = 'end', className = '' }: ActionRowProps) {
  return (
    <div 
      className={`button-row ${className}`}
      style={{ justifyContent: align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end' }}
    >
      {children}
    </div>
  );
}