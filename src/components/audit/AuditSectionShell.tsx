import type { ReactNode } from 'react';
import { SaveStatusIndicator } from '../ui';

export type AuditSectionLink = {
  href: string;
  label: string;
  complete?: boolean;
};

type AuditSectionShellProps = {
  children: ReactNode;
  sections: readonly AuditSectionLink[];
  title: string;
  description?: string;
  progressLabel?: string;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  actions?: ReactNode;
};

export function AuditSectionShell({
  children,
  sections,
  title,
  description,
  progressLabel,
  saveStatus = 'idle',
  actions
}: AuditSectionShellProps) {
  return (
    <section className="audit-section-shell profit-audit-section-shell">
      <aside className="audit-section-rail profit-audit-section-nav" aria-label={`${title} sections`}>
        <div className="audit-section-rail-head">
          <strong>{title}</strong>
          {progressLabel ? <span>{progressLabel}</span> : null}
        </div>
        <nav className="audit-section-rail-nav">
          {sections.map((section) => (
            <a
              className={`audit-section-rail-link profit-audit-section-pill ${section.complete ? 'is-complete' : ''}`}
              href={section.href}
              key={section.href}
            >
              <span>{section.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="audit-section-body profit-audit-section-body">
        <div className="audit-section-toolbar profit-audit-section-toolbar">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <div className="audit-section-toolbar-actions">
            <SaveStatusIndicator status={saveStatus} />
            {actions}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
