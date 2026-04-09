import type { PropsWithChildren } from 'react';

interface StatCardProps extends PropsWithChildren {
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ label, value, hint, children }: StatCardProps) {
  return (
    <div className="stat-card" style={{ 
      display: 'grid',
      placeItems: 'center',
      gap: '10px',
      padding: '28px 12px',
      textAlign: 'center',
      minHeight: '112px',
      width: '100%',
      background: 'var(--surface-card)',
      border: '1px solid var(--line)',
      borderRadius: '26px',
      boxShadow: 'var(--shadow-soft)',
      transition: 'all 0.22s ease'
    }}>
      <div style={{
        width: '52px',
        height: '3px',
        borderRadius: '999px',
        background: 'var(--accent)',
        opacity: 0.8
      }}/>
      <div className="stat-value" style={{ 
        fontSize: '38px', 
        fontWeight: 800, 
        lineHeight: '1', 
        letterSpacing: '-0.04em',
        color: 'var(--text)'
      }}>{value}</div>
      <div className="stat-label" style={{ 
        fontSize: '12px', 
        opacity: 0.78, 
        fontWeight: 700, 
        textTransform: 'uppercase', 
        letterSpacing: '0.1em',
        color: 'var(--text)'
      }}>{label}</div>
      {children}
    </div>
  );
}
