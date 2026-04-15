import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fmtCurrency } from '../../lib/utils';
import { getClientPortalShareByToken } from '../../services/reportShares';
import type { ClientPortalResource, ClientPortalSharePayload } from '../../types';

function formatShortDate(value?: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function resourceKindLabel(kind: ClientPortalResource['kind']) {
  if (kind === 'audit') return 'Kitchen audit';
  if (kind === 'food_safety') return 'Food safety audit';
  if (kind === 'mystery_shop') return 'Mystery shop';
  return 'Menu review';
}

function invoiceStatusLabel(portal: ClientPortalSharePayload) {
  if (!portal.hasOutstandingInvoices) return 'Released and up to date';
  if (portal.visibilityMode === 'paid_only') return 'Locked until payment clears';
  return 'Open balance on account';
}

export function ClientPortalPage() {
  const { token = '' } = useParams();
  const [portal, setPortal] = useState<ClientPortalSharePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading client portal...');

  useEffect(() => {
    let cancelled = false;

    async function loadPortal() {
      if (!token) {
        setMessage('This portal link is incomplete.');
        setLoading(false);
        return;
      }

      try {
        const share = await getClientPortalShareByToken(token);

        if (cancelled) return;

        if (!share) {
          setMessage('This client portal is no longer available.');
          setLoading(false);
          return;
        }

        setPortal(share.payload);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : 'Could not load this client portal.');
        setLoading(false);
      }
    }

    void loadPortal();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const releasedResources = useMemo(
    () => portal?.resources.filter((item) => !item.locked) ?? [],
    [portal]
  );
  const lockedResources = useMemo(
    () => portal?.resources.filter((item) => item.locked) ?? [],
    [portal]
  );
  const nextActions = useMemo(
    () => portal?.tasks.filter((task) => task.title.trim()).slice(0, 6) ?? [],
    [portal]
  );

  if (loading || !portal) {
    return (
      <main className="client-portal-loading">
        <div className="client-portal-loading-card">
          <p className="client-portal-eyebrow">The Final Check</p>
          <h1>Client portal</h1>
          <p>{message}</p>
          <Link to="/login" className="client-portal-return-link">
            Return to workspace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="client-portal-page">
      <section className="client-portal-shell client-portal-shell-clean">
        <header className="client-portal-clean-hero">
          <div className="client-portal-clean-copy">
            <p className="client-portal-eyebrow">The Final Check Client Portal</p>
            <h1>{portal.welcomeTitle || `Welcome, ${portal.clientName}`}</h1>
            <p className="client-portal-clean-lead">
              {portal.welcomeMessage ||
                'Your latest reviews, shared reports, and agreed next actions are available below.'}
            </p>

            <div className="client-portal-chip-row">
              <span>{portal.clientName}</span>
              <span>{portal.industry || 'Client workspace'}</span>
              <span>{portal.location || 'Location not set'}</span>
              <span>Next review {formatShortDate(portal.nextReviewDate)}</span>
            </div>
          </div>

          <aside className="client-portal-clean-summary">
            {portal.logoUrl ? (
              <img
                src={portal.logoUrl}
                alt={portal.clientName}
                className="client-portal-brand-image"
              />
            ) : (
              <div className="client-portal-brand-fallback" aria-hidden="true">
                {portal.clientName.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="client-portal-clean-summary-copy">
              <strong>{portal.clientName}</strong>
              <span>Published {formatShortDate(portal.publishedAt)}</span>
              <span>{invoiceStatusLabel(portal)}</span>
            </div>
          </aside>
        </header>

        <section className="client-portal-clean-stats">
          <article className="client-portal-stat-card">
            <span>Released items</span>
            <strong>{releasedResources.length}</strong>
            <small>Reports and resources currently open to view.</small>
          </article>
          <article className="client-portal-stat-card">
            <span>Held items</span>
            <strong>{lockedResources.length}</strong>
            <small>Visible in the portal but not yet available to open.</small>
          </article>
          <article className="client-portal-stat-card">
            <span>Open actions</span>
            <strong>{portal.openTaskCount}</strong>
            <small>Follow-up items still being worked through.</small>
          </article>
          <article className="client-portal-stat-card">
            <span>Outstanding balance</span>
            <strong>
              {portal.hasOutstandingInvoices
                ? fmtCurrency(portal.outstandingInvoiceValue)
                : 'Up to date'}
            </strong>
            <small>{invoiceStatusLabel(portal)}</small>
          </article>
        </section>

        <section className="client-portal-main client-portal-main-clean">
          <div className="client-portal-primary">
            {portal.portalNote ? (
              <article className="client-portal-note-card">
                <p className="client-portal-section-kicker">Portal note</p>
                <p>{portal.portalNote}</p>
              </article>
            ) : null}

            <article className="client-portal-section">
              <div className="client-portal-section-heading">
                <div>
                  <p className="client-portal-section-kicker">Released work</p>
                  <h2>Reports ready to open</h2>
                </div>
                <span className="client-portal-section-count">{releasedResources.length}</span>
              </div>

              {releasedResources.length === 0 ? (
                <div className="client-portal-empty-state">
                  No reports or resources have been released yet.
                </div>
              ) : (
                <div className="client-portal-resource-list">
                  {releasedResources.map((resource) => (
                    <article className="client-portal-resource-card" key={resource.id}>
                      <div className="client-portal-resource-copy">
                        <div className="client-portal-resource-header">
                          <strong>{resource.title}</strong>
                          <span>{resourceKindLabel(resource.kind)}</span>
                        </div>
                        <p>{resource.subtitle || 'Released client document'}</p>
                        <div className="client-portal-resource-meta">
                          <span>Review {formatShortDate(resource.reviewDate)}</span>
                          <span>{resource.url ? 'Available now' : 'Awaiting link'}</span>
                        </div>
                      </div>

                      {resource.url ? (
                        <a
                          className="client-portal-resource-link"
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open report
                        </a>
                      ) : (
                        <span className="client-portal-resource-pill">Link pending</span>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </article>

            {lockedResources.length > 0 ? (
              <article className="client-portal-section client-portal-section-muted">
                <div className="client-portal-section-heading">
                  <div>
                    <p className="client-portal-section-kicker">Awaiting release</p>
                    <h2>Items still held back</h2>
                  </div>
                  <span className="client-portal-section-count">{lockedResources.length}</span>
                </div>

                <div className="client-portal-resource-list">
                  {lockedResources.map((resource) => (
                    <article
                      className="client-portal-resource-card client-portal-resource-card-locked"
                      key={resource.id}
                    >
                      <div className="client-portal-resource-copy">
                        <div className="client-portal-resource-header">
                          <strong>{resource.title}</strong>
                          <span>{resourceKindLabel(resource.kind)}</span>
                        </div>
                        <p>{resource.subtitle || 'Held client document'}</p>
                        <div className="client-portal-resource-lock">
                          {resource.lockReason || 'This item is currently unavailable.'}
                        </div>
                      </div>
                      <div className="client-portal-resource-pill">Locked</div>
                    </article>
                  ))}
                </div>
              </article>
            ) : null}
          </div>

          <aside className="client-portal-sidebar">
            <article className="client-portal-side-card">
              <p className="client-portal-section-kicker">Portal overview</p>
              <h3>Account status</h3>
              <div className="client-portal-side-list">
                <div>
                  <span>Portal access</span>
                  <strong>{portal.hasOutstandingInvoices ? 'Partially restricted' : 'Open'}</strong>
                </div>
                <div>
                  <span>Release rule</span>
                  <strong>
                    {portal.visibilityMode === 'paid_only' ? 'Release after payment' : 'Immediate release'}
                  </strong>
                </div>
                <div>
                  <span>Paid value</span>
                  <strong>{fmtCurrency(portal.paidInvoiceValue)}</strong>
                </div>
                <div>
                  <span>Outstanding value</span>
                  <strong>{fmtCurrency(portal.outstandingInvoiceValue)}</strong>
                </div>
              </div>
            </article>

            <article className="client-portal-side-card">
              <p className="client-portal-section-kicker">Action plan</p>
              <h3>Next follow-up steps</h3>

              {nextActions.length === 0 ? (
                <div className="client-portal-empty-state compact">
                  No open actions are currently listed in this portal.
                </div>
              ) : (
                <div className="client-portal-task-list">
                  {nextActions.map((task) => (
                    <div className="client-portal-task-card" key={task.id}>
                      <strong>{task.title}</strong>
                      <span>{task.owner || 'The Final Check team'}</span>
                      <small>
                        {task.dueDate ? `Due ${formatShortDate(task.dueDate)}` : 'Due date to be confirmed'}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
