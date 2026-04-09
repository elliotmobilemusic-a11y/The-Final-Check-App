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
      padding: '22px 16px 26px', 
      gap: '6px',
      textAlign: 'center',
      minHeight: '104px',
      width: '100%',
      background: 'var(--surface-card-strong)',
      border: '1px solid var(--surface-shadow-line)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-soft)',
      transition: 'all 0.18s ease'
    }}>
      <div style={{ 
        width: '44px',
        height: '3px',
        borderRadius: '999px',
        background: 'linear-gradient(90deg, rgba(198, 161, 97, 0), rgba(198, 161, 97, 0.9), rgba(198, 161, 97, 0))',
        marginBottom: '8px',
        opacity: 0.8
      }}/>
      <div className="stat-value" style={{ fontSize: '28px', fontWeight: 800, lineHeight: '1', letterSpacing: '-0.02em' }}>{value}</div>
      <div className="stat-label" style={{ fontSize: '12px', opacity: 0.75, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {children}
    </div>
  );
}
