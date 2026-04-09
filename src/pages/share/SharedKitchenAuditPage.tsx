import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buildReportDocumentHtml } from '../../features/clients/clientExports';
import { buildKitchenAuditReportHtml } from '../audit/KitchenAuditPage';
import { getKitchenAuditShareByToken } from '../../services/reportShares';
import type { AuditFormState } from '../../types';

export function SharedKitchenAuditPage() {
  const { token = '' } = useParams();
  const [audit, setAudit] = useState<AuditFormState | null>(null);
  const [title, setTitle] = useState('Kitchen audit report');
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('Loading shared report...');

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage('This share link is incomplete.');
      return;
    }

    getKitchenAuditShareByToken(token)
      .then((share) => {
        if (!share) {
          setStatus('missing');
          setMessage('This shared report is no longer available.');
          return;
        }

        setAudit(share.payload);
        setTitle(share.title || 'Kitchen audit report');
        setStatus('ready');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not load this shared report.');
      });
  }, [token]);

  const documentHtml = useMemo(() => {
    if (!audit) return '';

    return buildReportDocumentHtml(
      `${title} | The Final Check`,
      buildKitchenAuditReportHtml(audit),
      {
        autoPrint: false,
        showCloseButton: false,
        formatLabel: 'Shared HTML report'
      }
    );
  }, [audit, title]);

  if (status !== 'ready' || !audit) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '32px',
          background:
            'radial-gradient(circle at top, rgba(214, 188, 140, 0.24), transparent 40%), #f6f1ea'
        }}
      >
        <div
          style={{
            width: 'min(560px, 100%)',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(115, 95, 64, 0.12)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 30px 80px rgba(52, 41, 24, 0.12)'
          }}
        >
          <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '12px', color: '#7b6b54', fontWeight: 700 }}>
            The Final Check
          </p>
          <h1 style={{ margin: '12px 0 10px', fontSize: '32px', color: '#2d2b31' }}>
            {status === 'loading' ? 'Opening report' : 'Report unavailable'}
          </h1>
          <p style={{ margin: 0, color: '#5c5752', lineHeight: 1.6 }}>{message}</p>
          <div style={{ marginTop: '22px' }}>
            <Link to="/login" style={{ color: '#4d6484', fontWeight: 700, textDecoration: 'none' }}>
              Return to workspace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#ece5da' }}>
      <iframe
        title={title}
        srcDoc={documentHtml}
        style={{ width: '100%', minHeight: '100vh', border: 0 }}
      />
    </main>
  );
}
