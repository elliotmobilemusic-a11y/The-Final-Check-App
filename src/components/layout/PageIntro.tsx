import type { PropsWithChildren, ReactNode } from 'react';

type PageIntroProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  side?: ReactNode;
}>;

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  side,
  children
}: PageIntroProps) {
  return (
    <section className="page-intro">
      <div className="page-intro-main">
        <span className="page-intro-eyebrow">{eyebrow}</span>
        <div className="page-intro-copy">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {children ? <div className="page-intro-meta">{children}</div> : null}
        {actions ? <div className="page-intro-actions">{actions}</div> : null}
      </div>

      {side ? <aside className="page-intro-side">{side}</aside> : null}
    </section>
  );
}
