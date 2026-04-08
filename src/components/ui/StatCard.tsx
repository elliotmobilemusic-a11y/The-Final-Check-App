import type { PropsWithChildren } from 'react';

interface StatCardProps extends PropsWithChildren {
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ label, value, hint, children }: StatCardProps) {
  return (
    <div className="stat-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: '12px' }}>
      <div>
        <div className="stat-label">{label}</div>
        {hint ? <div className="stat-hint" style={{ fontSize: '11px', opacity: 0.65 }}>{hint}</div> : null}
      </div>
      <div className="stat-value" style={{ fontSize: '16px', fontWeight: 600, minWidth: '70px', textAlign: 'right' }}>{value}</div>
      {children}
    </div>
  );
}
