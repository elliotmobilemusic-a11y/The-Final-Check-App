import type { PropsWithChildren } from 'react';

interface StatCardProps extends PropsWithChildren {
  label: string;
  value: string;
  hint?: string;
  size?: 'default' | 'compact';
}

export function StatCard({ label, value, hint, size = 'default', children }: StatCardProps) {
  return (
    <div className={`stat-card ${size === 'compact' ? 'stat-card-compact' : ''}`} title={hint}>
      <div className="stat-card-accent" aria-hidden="true" />
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {children}
    </div>
  );
}
