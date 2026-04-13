import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SharedReportFrame } from '../../components/share/SharedReportFrame';
import { getReportShareByToken } from '../../services/reportShares';

export function SharedReportPage() {
  const { token = '' } = useParams();
  const [report, setReport] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    getReportShareByToken(token)
      .then((data) => {
        if (!data) {
          setStatus('missing');
          return;
        }
        setReport(data.payload);
        setStatus('ready');
      })
      .catch(() => setStatus('missing'));
  }, [token]);

  return (
    <SharedReportFrame
      bodyHtml={String(report?.html ?? '')}
      message="Loading shared report..."
      ready={status === 'ready'}
      status={status === 'ready' ? 'ready' : status}
      title={String(report?.title ?? 'Shared report')}
    />
  );
}
