import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getClientPortalShareByToken } from '../../services/reportShares';
import type { ClientPortalSharePayload } from '../../types';
import { fmtCurrency } from '../../lib/utils';

function formatShortDate(value?: string | null) {
  if (!value) return 'No date set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

export function ClientPortalPage() {
  const { token = '' } = useParams();
  const [portal, setPortal] = useState<ClientPortalSharePayload | null>(null);
  const [message, setMessage] = useState('Loading client portal...');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage('This portal link is incomplete.');
      return;
    }

    getClientPortalShareByToken(token)
      .then((share) => {
        if (!share) {
          setMessage('This client portal is no longer available.');
          return;
        }

        setPortal(share.payload);
        setReady(true);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Could not load this client portal.');
      });
  }, [token]);

  const lockedCount = useMemo(
    () => portal?.resources.filter((item) => item.locked).length ?? 0,
    [portal]
  );

  if (!ready || !portal) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '32px',
          background:
            'radial-gradient(circle at top, rgba(214, 188, 140, 0.24), transparent 36%), #f6f3ee'
        }}
      >
        <div
          style={{
            width: 'min(560px, 100%)',
            background: 'rgba(255,255,255,0.92)',
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
            Client portal
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
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #f7f4ef 0%, #efe7db 100%)',
        color: '#2d2b31'
      }}
    >
      <section
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '48px 24px 24px'
        }}
      >
        <div
          style={{
            borderRadius: '32px',
            overflow: 'hidden',
            border: '1px solid rgba(99, 81, 55, 0.12)',
            background:
              `linear-gradient(135deg, rgba(72, 88, 104, 0.86), rgba(34, 42, 51, 0.92)), url(${portal.coverUrl || portal.logoUrl || ''}) center/cover`,
            boxShadow: '0 24px 70px rgba(53, 41, 25, 0.14)'
          }}
        >
          <div
            style={{
              padding: '42px 36px',
              color: '#fff',
              display: 'grid',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {portal.logoUrl ? (
                <img
                  src={portal.logoUrl}
                  alt={portal.clientName}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '18px',
                    objectFit: 'cover',
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.16)'
                  }}
                />
              ) : null}
              <div>
                <p style={{ margin: 0, fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.78 }}>
                  The Final Check Client Portal
                </p>
                <h1 style={{ margin: '10px 0 6px', fontSize: '42px', lineHeight: 0.98 }}>
                  {portal.welcomeTitle || `Welcome, ${portal.clientName}`}
                </h1>
                <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.6, maxWidth: '720px', opacity: 0.92 }}>
                  {portal.welcomeMessage}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', fontSize: '12px' }}>
                {portal.clientName}
              </span>
              <span style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', fontSize: '12px' }}>
                {portal.industry || 'Client workspace'}
              </span>
              <span style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', fontSize: '12px' }}>
                Next review {formatShortDate(portal.nextReviewDate)}
              </span>
              <span style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', fontSize: '12px' }}>
                {portal.hasOutstandingInvoices ? 'Access partially locked' : 'All released work available'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '0 24px 48px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.85fr)',
          gap: '22px'
        }}
      >
        <div style={{ display: 'grid', gap: '22px' }}>
          <article
            style={{
              background: '#fff',
              border: '1px solid rgba(99, 81, 55, 0.12)',
              borderRadius: '26px',
              padding: '26px',
              boxShadow: '0 18px 48px rgba(53, 41, 25, 0.08)'
            }}
          >
            <div style={{ marginBottom: '18px' }}>
              <p style={{ margin: 0, color: '#7b6b54', fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
                Your Released Work
              </p>
              <h2 style={{ margin: '10px 0 8px', fontSize: '28px' }}>Reports and action plans</h2>
              <p style={{ margin: 0, color: '#5c5752', lineHeight: 1.6 }}>
                Review the documents that have been released to your portal. Locked items stay visible but protected until they are cleared for access.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {portal.resources.length === 0 ? (
                <div style={{ padding: '18px', borderRadius: '18px', background: '#f8f5ef', color: '#5c5752' }}>
                  No reports or resources have been released yet.
                </div>
              ) : null}

              {portal.resources.map((resource) => (
                <div
                  key={resource.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '18px',
                    borderRadius: '20px',
                    border: '1px solid rgba(99, 81, 55, 0.12)',
                    background: resource.locked ? '#f8f5ef' : '#fff'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <strong>{resource.title}</strong>
                      <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#f1eadf', color: '#785f39', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {resource.kind === 'audit' ? 'Audit' : 'Resource'}
                      </span>
                    </div>
                    <div style={{ color: '#5c5752', fontSize: '14px', lineHeight: 1.6 }}>
                      {resource.subtitle}
                      {resource.reviewDate ? ` • ${formatShortDate(resource.reviewDate)}` : ''}
                    </div>
                    {resource.locked ? (
                      <div style={{ marginTop: '8px', color: '#8a5c32', fontSize: '13px' }}>
                        {resource.lockReason}
                      </div>
                    ) : null}
                  </div>

                  {resource.url && !resource.locked ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '12px 16px',
                        borderRadius: '999px',
                        textDecoration: 'none',
                        background: '#445c7a',
                        color: '#fff',
                        fontWeight: 700
                      }}
                    >
                      Open
                    </a>
                  ) : (
                    <span
                      style={{
                        padding: '12px 16px',
                        borderRadius: '999px',
                        background: '#ece4d8',
                        color: '#8a5c32',
                        fontWeight: 700
                      }}
                    >
                      Locked
                    </span>
                  )}
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside style={{ display: 'grid', gap: '22px' }}>
          <article
            style={{
              background: '#fff',
              border: '1px solid rgba(99, 81, 55, 0.12)',
              borderRadius: '26px',
              padding: '24px',
              boxShadow: '0 18px 48px rgba(53, 41, 25, 0.08)'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '22px' }}>Portal status</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span>Outstanding value</span>
                <strong>{fmtCurrency(portal.outstandingInvoiceValue)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span>Paid to date</span>
                <strong>{fmtCurrency(portal.paidInvoiceValue)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span>Open tasks</span>
                <strong>{portal.openTaskCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span>Locked resources</span>
                <strong>{lockedCount}</strong>
              </div>
            </div>
            {portal.portalNote ? (
              <div style={{ marginTop: '18px', padding: '16px', borderRadius: '18px', background: '#f8f5ef', color: '#5c5752', lineHeight: 1.6 }}>
                {portal.portalNote}
              </div>
            ) : null}
          </article>

          <article
            style={{
              background: '#fff',
              border: '1px solid rgba(99, 81, 55, 0.12)',
              borderRadius: '26px',
              padding: '24px',
              boxShadow: '0 18px 48px rgba(53, 41, 25, 0.08)'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '22px' }}>Action plan</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {portal.tasks.length === 0 ? (
                <div style={{ color: '#5c5752' }}>No open actions have been released yet.</div>
              ) : null}
              {portal.tasks.map((task) => (
                <div key={task.id} style={{ padding: '14px 16px', borderRadius: '18px', background: '#f8f5ef' }}>
                  <strong>{task.title || 'Action item'}</strong>
                  <div style={{ marginTop: '6px', color: '#5c5752', fontSize: '14px', lineHeight: 1.6 }}>
                    {task.owner || 'Owner to be confirmed'} • {task.dueDate ? formatShortDate(task.dueDate) : 'No due date'} • {task.status}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
