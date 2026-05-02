import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SharedReportFrame } from '../../components/share/SharedReportFrame';
import { buildKitchenAuditReportHtml } from '../../features/audits/kitchenAuditReport';
import { getKitchenAuditShareByToken } from '../../services/reportShares';
import type { AuditFormState } from '../../types';

export function SharedKitchenAuditPage() {
  const { token = '' } = useParams();
  const [audit, setAudit] = useState<AuditFormState | null>(null);
  const [title, setTitle] = useState('Kitchen Profit Audit report');
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
        setTitle(share.title || 'Kitchen Profit Audit report');
        setStatus('ready');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not load this shared report.');
      });
  }, [token]);

  return (
    <SharedReportFrame
      bodyHtml={audit ? buildKitchenAuditReportHtml(audit) : ''}
      message={message}
      printDeliverableKind="kitchen-audit"
      ready={status === 'ready' && Boolean(audit)}
      status={status}
      title={title}
    />
  );
}
