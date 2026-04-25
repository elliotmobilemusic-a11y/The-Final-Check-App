import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SharedReportFrame } from '../../components/share/SharedReportFrame';
import { buildMenuReport } from '../../features/menu-engine/menuBuilderHelpers';
import { getMenuShareByToken } from '../../services/reportShares';
import type { MenuProjectState } from '../../types';

export function SharedMenuPage() {
  const { token = '' } = useParams();
  const [project, setProject] = useState<MenuProjectState | null>(null);
  const [title, setTitle] = useState('Menu Profit Engine report');
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('Loading shared report...');

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage('This share link is incomplete.');
      return;
    }

    getMenuShareByToken(token)
      .then((share) => {
        if (!share) {
          setStatus('missing');
          setMessage('This shared report is no longer available.');
          return;
        }

        setProject(share.payload);
        setTitle(share.title || 'Menu Profit Engine report');
        setStatus('ready');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not load this shared report.');
      });
  }, [token]);

  return (
    <SharedReportFrame
      bodyHtml={project ? buildMenuReport(project) : ''}
      message={message}
      ready={status === 'ready' && Boolean(project)}
      status={status}
      title={title}
    />
  );
}
