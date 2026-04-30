import { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  size?: 'default' | 'compact';
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, size = 'default', className = '' }: PageHeaderProps) {
  return (
    <header className={`page-header ${size === 'compact' ? 'py-4 md:py-5' : 'py-6 md:py-8'} ${className}`}>
      <div className="page-header-inner flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-8">
        <div className="page-header-content">
          {eyebrow && <div className="page-header-eyebrow text-sm font-semibold text-muted mb-1 uppercase tracking-wider">{eyebrow}</div>}
          <h1 className="page-header-title text-2xl md:text-3xl font-bold mb-2">{title}</h1>
          {description && <p className="page-header-description text-muted max-w-2xl">{description}</p>}
        </div>
        
        {actions && (
          <div className="page-header-actions flex flex-wrap items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}