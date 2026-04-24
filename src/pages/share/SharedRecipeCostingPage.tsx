import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SharedReportFrame } from '../../components/share/SharedReportFrame';
import { getRecipeCostingShareByToken } from '../../services/reportShares';

type SharedReportPayload = {
  html?: string;
  title?: string;
};

export function SharedRecipeCostingPage() {
  const { token = '' } = useParams();
  const [report, setReport] = useState<SharedReportPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    getRecipeCostingShareByToken(token)
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
      eyebrow="Recipe Costing Sheet"
      loadingTitle="Opening recipe costing"
      message="Loading shared recipe costing sheet..."
      missingTitle="Recipe costing unavailable"
      ready={status === 'ready'}
      status={status === 'ready' ? 'ready' : status}
      title={String(report?.title ?? 'Recipe costing sheet')}
    />
  );
}
