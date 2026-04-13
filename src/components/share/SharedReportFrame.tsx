import { Link } from 'react-router-dom';
import { buildReportDocumentHtml } from '../../features/clients/clientExports';
import { downloadText } from '../../lib/utils';

type SharedReportFrameProps = {
  bodyHtml: string;
  message: string;
  ready: boolean;
  status: 'loading' | 'ready' | 'missing' | 'error';
  title: string;
};

export function SharedReportFrame({
  bodyHtml,
  message,
  ready,
  status,
  title
}: SharedReportFrameProps) {
  const documentHtml = ready
    ? buildReportDocumentHtml(`${title} | The Final Check`, bodyHtml, {
        autoPrint: false,
        showCloseButton: false,
        formatLabel: 'Shared HTML report'
      })
    : '';

  if (!ready) {
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
          <p
            style={{
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontSize: '12px',
              color: '#7b6b54',
              fontWeight: 700
            }}
          >
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
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          background: 'rgba(246, 241, 234, 0.92)',
          borderBottom: '1px solid rgba(115, 95, 64, 0.14)',
          backdropFilter: 'blur(12px)'
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#7b6b54',
              fontWeight: 700
            }}
          >
            Shared Report
          </p>
          <strong style={{ color: '#2d2b31' }}>{title}</strong>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              border: 0,
              borderRadius: '999px',
              padding: '12px 18px',
              background: '#445c7a',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Print / Save PDF
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'shared-report'}.html`,
                documentHtml,
                'text/html'
              )
            }
            style={{
              border: '1px solid rgba(68, 92, 122, 0.18)',
              borderRadius: '999px',
              padding: '12px 18px',
              background: '#fff',
              color: '#2d2b31',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Download HTML
          </button>
        </div>
      </div>
      <iframe
        title={title}
        srcDoc={documentHtml}
        style={{ width: '100%', minHeight: 'calc(100vh - 81px)', border: 0 }}
      />
    </main>
  );
}
