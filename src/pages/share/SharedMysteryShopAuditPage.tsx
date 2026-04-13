import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SharedReportFrame } from '../../components/share/SharedReportFrame';
import { buildMysteryShopReport } from '../audit/MysteryShopAuditPage';
import { getMysteryShopShareByToken } from '../../services/reportShares';
import type { MysteryShopAuditState } from '../../types';

export function SharedMysteryShopAuditPage() {
  const { token = '' } = useParams();
  const [audit, setAudit] = useState<MysteryShopAuditState | null>(null);
  const [title, setTitle] = useState('Mystery Shop Audit report');
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('Loading shared report...');

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage('This share link is incomplete.');
      return;
    }

    getMysteryShopShareByToken(token)
      .then((share) => {
        if (!share) {
          setStatus('missing');
          setMessage('This shared report is no longer available.');
          return;
        }

        setAudit(share.payload);
        setTitle(share.title || 'Mystery Shop Audit report');
        setStatus('ready');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not load this shared report.');
      });
  }, [token]);

  return (
    <SharedReportFrame
      bodyHtml={audit ? buildMysteryShopReport(audit) : ''}
      message={message}
      ready={status === 'ready' && Boolean(audit)}
      status={status}
      title={title}
    />
  );
}
