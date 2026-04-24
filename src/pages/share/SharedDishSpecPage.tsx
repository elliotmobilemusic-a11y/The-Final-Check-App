import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SharedReportFrame } from '../../components/share/SharedReportFrame';
import { getDishSpecShareByToken } from '../../services/reportShares';

type SharedReportPayload = {
  html?: string;
  title?: string;
};

export function SharedDishSpecPage() {
  const { token = '' } = useParams();
  const [report, setReport] = useState<SharedReportPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    getDishSpecShareByToken(token)
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
      eyebrow="Dish Spec Sheet"
      loadingTitle="Opening dish spec"
      message="Loading shared dish specification..."
      missingTitle="Dish spec unavailable"
      ready={status === 'ready'}
      status={status === 'ready' ? 'ready' : status}
      title={String(report?.title ?? 'Dish spec sheet')}
    />
  );
}
