import type { PropsWithChildren } from 'react';

interface StatCardProps extends PropsWithChildren {
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ label, value, hint, children }: StatCardProps) {
  return (
    <div className="stat-card" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px 16px', 
      gap: '8px',
      textAlign: 'center',
      minHeight: '92px'
    }}>
      <div className="stat-value" style={{ fontSize: '24px', fontWeight: 700 }}>{value}</div>
      <div className="stat-label" style={{ fontSize: '12px', opacity: 0.8 }}>{label}</div>
      {children}
    </div>
  );
}
