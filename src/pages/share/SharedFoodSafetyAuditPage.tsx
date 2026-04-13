import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SharedReportFrame } from '../../components/share/SharedReportFrame';
import { buildFoodSafetyReport } from '../audit/FoodSafetyAuditPage';
import { getFoodSafetyShareByToken } from '../../services/reportShares';
import type { FoodSafetyAuditState } from '../../types';

export function SharedFoodSafetyAuditPage() {
  const { token = '' } = useParams();
  const [audit, setAudit] = useState<FoodSafetyAuditState | null>(null);
  const [title, setTitle] = useState('Food Safety Audit report');
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('Loading shared report...');

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage('This share link is incomplete.');
      return;
    }

    getFoodSafetyShareByToken(token)
      .then((share) => {
        if (!share) {
          setStatus('missing');
          setMessage('This shared report is no longer available.');
          return;
        }

        setAudit(share.payload);
        setTitle(share.title || 'Food Safety Audit report');
        setStatus('ready');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not load this shared report.');
      });
  }, [token]);

  return (
    <SharedReportFrame
      bodyHtml={audit ? buildFoodSafetyReport(audit) : ''}
      message={message}
      ready={status === 'ready' && Boolean(audit)}
      status={status}
      title={title}
    />
  );
}
