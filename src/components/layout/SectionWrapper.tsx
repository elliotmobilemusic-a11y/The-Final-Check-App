import { ReactNode } from 'react';

interface SectionWrapperProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  gap?: 'default' | 'small' | 'large';
}

export function SectionWrapper({ children, title, subtitle, actions, className = '', gap = 'default' }: SectionWrapperProps) {
  const gapClasses = {
    small: 'gap-3',
    default: 'gap-4',
    large: 'gap-6'
  };

  return (
    <section className={`section-wrapper ${className}`}>
      {(title || actions) && (
        <div className="section-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            {title && <h2 className="section-title text-lg font-bold">{title}</h2>}
            {subtitle && <p className="section-subtitle text-sm text-muted mt-1">{subtitle}</p>}
          </div>
          
          {actions && (
            <div className="section-actions flex flex-wrap items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      
      <div className={`section-content grid ${gapClasses[gap]}`}>
        {children}
      </div>
    </section>
  );
}