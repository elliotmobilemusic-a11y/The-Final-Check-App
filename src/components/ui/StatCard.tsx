import type { PropsWithChildren } from 'react';

interface StatCardProps extends PropsWithChildren {
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ label, value, hint, children }: StatCardProps) {
  return (
    <div className="stat-card" title={hint}>
      <div className="stat-card-accent" aria-hidden="true" />
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {children}
    </div>
  );
}
