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
      padding: '20px 16px 24px', 
      gap: '6px',
      textAlign: 'center',
      minHeight: '96px',
      width: '100%',
      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(250, 247, 242, 0.98))',
      border: '1px solid rgba(91, 86, 81, 0.06)',
      borderRadius: '22px',
      boxShadow: '0 10px 24px rgba(22, 18, 15, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      transition: 'all 0.2s ease'
    }}>
      <div className="stat-value" style={{ 
        fontSize: '32px', 
        fontWeight: 700, 
        lineHeight: '1', 
        letterSpacing: '-0.03em',
        color: 'var(--text)',
        margin: 0,
        padding: 0,
        fontVariationSettings: "'wght' 700"
      }}>{value}</div>
      <div className="stat-label" style={{ 
        fontSize: '11px', 
        opacity: 0.7, 
        fontWeight: 600, 
        textTransform: 'uppercase', 
        letterSpacing: '0.12em',
        color: 'var(--text)',
        margin: 0,
        padding: 0
      }}>{label}</div>
      {children}
    </div>
  );
}
